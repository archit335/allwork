import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notify";
import { dispatchWave } from "./matching";
import { atTime } from "./utils";

/*
 * FIRST-RESPONDER ALLOCATION
 *
 * - Each accepted request creates a Reservation (HELD) for one position.
 * - Accepts on the same job are serialised with a row lock on the Job
 *   (SELECT … FOR UPDATE), so positions can never be over-reserved.
 * - A HELD reservation expires after RESERVATION_MINUTES unless the worker
 *   submits a proposal (→ PROPOSED, still holding the position).
 * - When positions free up (expiry, withdrawal, client decline) waitlisted
 *   workers are re-invited first, then a new matching wave is dispatched.
 * - Reservation = priority, not employment. The client makes the final pick.
 */

const ACTIVE = ["HELD", "PROPOSED", "SELECTED"] as const;
export const RESERVATION_MINUTES = Number(process.env.RESERVATION_MINUTES ?? 30);
const COMMISSION_PCT = Number(process.env.PLATFORM_COMMISSION_PCT ?? 10);

export class AllocationError extends Error {}

type Tx = Prisma.TransactionClient;

async function lockJob(tx: Tx, jobId: string) {
  await tx.$queryRaw`SELECT id FROM "Job" WHERE id = ${jobId} FOR UPDATE`;
}

async function lockUser(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

export async function recomputeReliability(userId: string, tx: Tx | typeof db = db) {
  const p = await tx.workerProfile.findUnique({ where: { userId } });
  if (!p) return;
  let score = 70 + Math.min(25, p.completedJobs * 2) - p.cancelledJobs * 5 - p.expiredReservations * 2;
  if (p.ratingCount) score += (p.ratingAvg - 3.5) * 6;
  score = Math.max(0, Math.min(100, Math.round(score)));
  await tx.workerProfile.update({ where: { userId }, data: { reliabilityScore: score } });
}

/** Expire HELD reservations past their deadline, then refill freed positions. */
export async function sweepExpiredReservations(jobId?: string) {
  const expired = await db.reservation.findMany({
    where: { status: "HELD", expiresAt: { lt: new Date() }, ...(jobId ? { jobId } : {}) },
    select: { id: true, jobId: true, workerId: true, job: { select: { title: true } } },
    take: 500,
  });
  if (!expired.length) return 0;

  const touched = new Set<string>();
  for (const r of expired) {
    const changed = await db.$transaction(async (tx) => {
      const res = await tx.reservation.updateMany({ where: { id: r.id, status: "HELD" }, data: { status: "EXPIRED" } });
      if (!res.count) return false;
      await tx.allocationEvent.create({ data: { jobId: r.jobId, workerId: r.workerId, type: "EXPIRED", detail: "No proposal submitted in time; position released" } });
      await tx.workerProfile.update({ where: { userId: r.workerId }, data: { expiredReservations: { increment: 1 } } });
      await recomputeReliability(r.workerId, tx);
      await notify(r.workerId, { type: "RESERVATION_EXPIRED", title: "Reservation expired", body: `Your hold on "${r.job.title}" expired because no proposal was submitted.`, link: `/jobs/${r.jobId}` }, tx);
      return true;
    });
    if (changed) touched.add(r.jobId);
  }
  for (const id of touched) await refillPositions(id);
  return expired.length;
}

/** Re-invite waitlisted workers, or dispatch a new matching wave, when positions are open. */
export async function refillPositions(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, title: true, status: true, workersNeeded: true } });
  if (!job || job.status !== "OPEN") return;
  const active = await db.reservation.count({ where: { jobId, status: { in: [...ACTIVE] } } });
  const open = job.workersNeeded - active;
  if (open <= 0) return;

  const waitlisted = await db.jobMatch.findMany({ where: { jobId, status: "WAITLISTED" }, orderBy: { respondedAt: "asc" }, take: open * 2 });
  if (waitlisted.length) {
    await db.$transaction(async (tx) => {
      await tx.jobMatch.updateMany({ where: { id: { in: waitlisted.map((w) => w.id) } }, data: { status: "SENT" } });
      for (const w of waitlisted) {
        await notify(w.workerId, { type: "WORK_REQUEST", title: "A position just opened!", body: `"${job.title}" has an open spot again. Accept now to reserve it.`, link: "/dashboard/requests" }, tx);
      }
      await tx.allocationEvent.create({ data: { jobId, type: "REINVITED", detail: `${waitlisted.length} waitlisted workers re-invited` } });
    });
    return;
  }
  await dispatchWave(jobId);
}

export async function acceptRequest(jobId: string, workerId: string) {
  return db.$transaction(
    async (tx) => {
      await lockJob(tx, jobId);
      const job = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
      const match = await tx.jobMatch.findUnique({ where: { jobId_workerId: { jobId, workerId } } });
      if (!match) throw new AllocationError("This request was not sent to you.");
      if (job.status !== "OPEN") throw new AllocationError("This job is no longer open.");
      if (!["SENT", "WAITLISTED"].includes(match.status)) throw new AllocationError("You already responded to this request.");

      const prior = await tx.reservation.findUnique({ where: { jobId_workerId: { jobId, workerId } } });
      if (prior) throw new AllocationError("You already held a position on this job.");

      // Expire stale holds inside the lock so their positions are reusable now.
      await tx.reservation.updateMany({ where: { jobId, status: "HELD", expiresAt: { lt: new Date() } }, data: { status: "EXPIRED" } });

      const active = await tx.reservation.count({ where: { jobId, status: { in: [...ACTIVE] } } });
      if (active >= job.workersNeeded) {
        await tx.jobMatch.update({ where: { id: match.id }, data: { status: "WAITLISTED", respondedAt: new Date() } });
        await tx.allocationEvent.create({ data: { jobId, workerId, type: "WAITLISTED", detail: "All positions reserved" } });
        return { status: "waitlisted" as const, position: null };
      }

      const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);
      const reservation = await tx.reservation.create({ data: { jobId, workerId, expiresAt } });
      await tx.jobMatch.update({ where: { id: match.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
      await tx.workerProfile.update({ where: { userId: workerId }, data: { acceptedRequests: { increment: 1 } } });
      await tx.allocationEvent.create({ data: { jobId, workerId, type: "RESERVED", detail: `Position ${active + 1} of ${job.workersNeeded} reserved` } });
      await notify(job.clientId, { type: "WORKER_ACCEPTED", title: "A worker accepted your request", body: `${active + 1}/${job.workersNeeded} positions reserved for "${job.title}". Proposal coming soon.`, link: `/jobs/${jobId}` }, tx);
      return { status: "reserved" as const, position: active + 1, reservationId: reservation.id, expiresAt };
    },
    { timeout: 15_000 },
  );
}

export async function rejectRequest(jobId: string, workerId: string) {
  const res = await db.jobMatch.updateMany({
    where: { jobId, workerId, status: { in: ["SENT", "WAITLISTED"] } },
    data: { status: "REJECTED", respondedAt: new Date() },
  });
  if (!res.count) throw new AllocationError("Nothing to reject.");
}

export type ProposalInput = {
  pricingType: "HOURLY" | "DAILY" | "FIXED";
  rate: number;
  extraCharges: number;
  availableDate: Date;
  startTime: string;
  endTime: string;
  estimatedCompletion?: string | null;
  note?: string | null;
};

export function estimateTotal(p: Pick<ProposalInput, "pricingType" | "rate" | "extraCharges" | "startTime" | "endTime">) {
  const [sh, sm] = p.startTime.split(":").map(Number);
  const [eh, em] = p.endTime.split(":").map(Number);
  const hours = Math.max(0, (eh! * 60 + em! - (sh! * 60 + sm!)) / 60);
  const base = p.pricingType === "HOURLY" ? Math.round(p.rate * hours) : p.rate;
  return base + p.extraCharges;
}

export async function submitProposal(jobId: string, workerId: string, input: ProposalInput) {
  return db.$transaction(async (tx) => {
    await lockJob(tx, jobId);
    const r = await tx.reservation.findUnique({ where: { jobId_workerId: { jobId, workerId } }, include: { job: true, proposal: true } });
    if (!r) throw new AllocationError("Accept the request first to reserve a position.");
    if (r.status === "HELD" && r.expiresAt < new Date()) {
      await tx.reservation.update({ where: { id: r.id }, data: { status: "EXPIRED" } });
      throw new AllocationError("Your reservation expired before the proposal was submitted.");
    }
    if (!["HELD", "PROPOSED"].includes(r.status)) throw new AllocationError("Your reservation is no longer active.");
    if (r.job.status !== "OPEN") throw new AllocationError("This job is no longer open.");

    const start = atTime(input.availableDate, input.startTime);
    const end = atTime(input.availableDate, input.endTime);
    const clash = await tx.calendarBlock.findFirst({ where: { userId: workerId, type: { in: ["BUSY", "BOOKING"] }, start: { lt: end }, end: { gt: start } } });
    if (clash) throw new AllocationError("That time overlaps something already on your calendar.");

    const data = { ...input, totalEstimate: estimateTotal(input), status: "SUBMITTED" as const };
    const proposal = r.proposal
      ? await tx.proposal.update({ where: { id: r.proposal.id }, data })
      : await tx.proposal.create({ data: { ...data, reservationId: r.id, jobId, workerId } });
    await tx.reservation.update({ where: { id: r.id }, data: { status: "PROPOSED" } });
    await tx.allocationEvent.create({ data: { jobId, workerId, type: "PROPOSED", detail: `Proposal ₹${proposal.totalEstimate}` } });
    await notify(r.job.clientId, { type: "PROPOSAL", title: "New proposal received", body: `A worker sent a proposal of ₹${proposal.totalEstimate} for "${r.job.title}".`, link: `/jobs/${jobId}` }, tx);
    return proposal;
  });
}

export async function withdrawReservation(jobId: string, workerId: string) {
  await db.$transaction(async (tx) => {
    await lockJob(tx, jobId);
    const r = await tx.reservation.findUnique({ where: { jobId_workerId: { jobId, workerId } }, include: { proposal: true } });
    if (!r || !["HELD", "PROPOSED"].includes(r.status)) throw new AllocationError("Nothing to withdraw.");
    await tx.reservation.update({ where: { id: r.id }, data: { status: "RELEASED" } });
    if (r.proposal) await tx.proposal.update({ where: { id: r.proposal.id }, data: { status: "WITHDRAWN" } });
    await tx.allocationEvent.create({ data: { jobId, workerId, type: "WITHDRAWN", detail: "Worker released the position" } });
  });
  await refillPositions(jobId);
}

export async function declineProposal(proposalId: string, clientId: string) {
  const p = await db.proposal.findUnique({ where: { id: proposalId }, include: { job: true } });
  if (!p || p.job.clientId !== clientId) throw new AllocationError("Proposal not found.");
  if (p.status !== "SUBMITTED") throw new AllocationError("This proposal was already handled.");
  await db.$transaction(async (tx) => {
    await lockJob(tx, p.jobId);
    await tx.proposal.update({ where: { id: p.id }, data: { status: "REJECTED" } });
    await tx.reservation.update({ where: { id: p.reservationId }, data: { status: "RELEASED" } });
    await tx.allocationEvent.create({ data: { jobId: p.jobId, workerId: p.workerId, type: "DECLINED", detail: "Client declined proposal" } });
    await notify(p.workerId, { type: "PROPOSAL_DECLINED", title: "Proposal not selected", body: `The client went with someone else for "${p.job.title}". Keep going — more work is coming.`, link: "/dashboard/proposals" }, tx);
  });
  await refillPositions(p.jobId);
}

/** Client hires a worker: re-verify availability, create booking, block calendar atomically. */
export async function selectProposal(proposalId: string, clientId: string) {
  const booking = await db.$transaction(
    async (tx) => {
      const p = await tx.proposal.findUnique({ where: { id: proposalId }, include: { job: true } });
      if (!p || p.job.clientId !== clientId) throw new AllocationError("Proposal not found.");
      await lockJob(tx, p.jobId);
      await lockUser(tx, p.workerId); // serialises bookings for this worker → no double booking
      const fresh = await tx.proposal.findUniqueOrThrow({ where: { id: proposalId }, include: { reservation: true } });
      if (fresh.status !== "SUBMITTED" || fresh.reservation.status !== "PROPOSED") throw new AllocationError("This proposal is no longer available.");

      const start = atTime(fresh.availableDate, fresh.startTime);
      const end = atTime(fresh.availableDate, fresh.endTime);
      const clash = await tx.calendarBlock.findFirst({
        where: { userId: p.workerId, type: { in: ["BUSY", "BOOKING"] }, start: { lt: end }, end: { gt: start } },
      });
      if (clash) throw new AllocationError("This worker is no longer available at that time (calendar conflict).");

      const booking = await tx.booking.create({
        data: { jobId: p.jobId, proposalId, clientId, workerId: p.workerId, start, end, amount: fresh.totalEstimate },
      });
      await tx.calendarBlock.create({ data: { userId: p.workerId, start, end, type: "BOOKING", bookingId: booking.id, note: p.job.title } });
      await tx.proposal.update({ where: { id: proposalId }, data: { status: "ACCEPTED" } });
      await tx.reservation.update({ where: { id: fresh.reservationId }, data: { status: "SELECTED" } });
      await tx.conversation.create({
        data: { bookingId: booking.id, members: { create: [{ userId: clientId }, { userId: p.workerId }] } },
      });
      await tx.allocationEvent.create({ data: { jobId: p.jobId, workerId: p.workerId, type: "BOOKED", detail: `Booking ${booking.id}` } });
      await notify(p.workerId, { type: "BOOKED", title: "You're hired! 🎉", body: `Booking confirmed for "${p.job.title}".`, link: `/bookings/${booking.id}` }, tx);
      await notify(clientId, { type: "BOOKED", title: "Booking confirmed", body: `Your booking for "${p.job.title}" is confirmed.`, link: `/bookings/${booking.id}` }, tx);

      const selected = await tx.reservation.count({ where: { jobId: p.jobId, status: "SELECTED" } });
      if (selected >= p.job.workersNeeded) {
        await tx.job.update({ where: { id: p.jobId }, data: { status: "FILLED" } });
        const leftovers = await tx.reservation.findMany({ where: { jobId: p.jobId, status: { in: ["HELD", "PROPOSED"] } }, select: { id: true, workerId: true } });
        await tx.reservation.updateMany({ where: { id: { in: leftovers.map((l) => l.id) } }, data: { status: "RELEASED" } });
        await tx.proposal.updateMany({ where: { jobId: p.jobId, status: "SUBMITTED" }, data: { status: "REJECTED" } });
        await tx.jobMatch.updateMany({ where: { jobId: p.jobId, status: { in: ["SENT", "WAITLISTED"] } }, data: { status: "EXPIRED" } });
        for (const l of leftovers) {
          await notify(l.workerId, { type: "JOB_FILLED", title: "Positions filled", body: `"${p.job.title}" has been fully staffed.`, link: "/dashboard/proposals" }, tx);
        }
        await tx.allocationEvent.create({ data: { jobId: p.jobId, type: "FILLED", detail: "All positions filled" } });
      }
      return booking;
    },
    { timeout: 15_000 },
  );
  return booking;
}

export async function cancelBooking(bookingId: string, userId: string, reason: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { job: true } });
  if (!b || (b.clientId !== userId && b.workerId !== userId)) throw new AllocationError("Booking not found.");
  if (!["CONFIRMED", "IN_PROGRESS"].includes(b.status)) throw new AllocationError("This booking can't be cancelled.");
  const byWorker = b.workerId === userId;
  await db.$transaction(async (tx) => {
    await lockJob(tx, b.jobId);
    await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", cancelledBy: byWorker ? "WORKER" : "CLIENT", cancelReason: reason } });
    await tx.calendarBlock.deleteMany({ where: { bookingId: b.id } });
    await tx.reservation.updateMany({ where: { jobId: b.jobId, workerId: b.workerId }, data: { status: "RELEASED" } });
    if (byWorker) {
      await tx.workerProfile.update({ where: { userId: b.workerId }, data: { cancelledJobs: { increment: 1 } } });
      await recomputeReliability(b.workerId, tx);
    }
    // Refund any captured payment (test mode)
    await tx.payment.updateMany({ where: { bookingId: b.id, status: "PAID" }, data: { status: "REFUNDED" } });
    if (byWorker && b.job.status === "FILLED") await tx.job.update({ where: { id: b.jobId }, data: { status: "OPEN" } });
    await tx.allocationEvent.create({ data: { jobId: b.jobId, workerId: b.workerId, type: "CANCELLED", detail: `${byWorker ? "Worker" : "Client"}: ${reason}` } });
    await notify(byWorker ? b.clientId : b.workerId, { type: "BOOKING_CANCELLED", title: "Booking cancelled", body: `"${b.job.title}" was cancelled by the ${byWorker ? "worker" : "client"}. Reason: ${reason}`, link: `/bookings/${b.id}` }, tx);
  });
  if (byWorker) await refillPositions(b.jobId);
}

export function splitPayment(amount: number) {
  const commission = Math.round((amount * COMMISSION_PCT) / 100);
  return { commission, workerEarning: amount - commission, pct: COMMISSION_PCT };
}
