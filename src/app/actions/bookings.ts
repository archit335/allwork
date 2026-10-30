"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { AllocationError, cancelBooking, recomputeReliability, splitPayment } from "@/lib/allocation";

type R = { error?: string; ok?: string } | undefined;

async function load(bookingId: string, userId: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { job: { select: { id: true, title: true, workersNeeded: true } } } });
  if (!b || (b.clientId !== userId && b.workerId !== userId)) return null;
  return b;
}

export async function startBookingAction(bookingId: string): Promise<R> {
  const user = await requireUser();
  const b = await load(bookingId, user.id);
  if (!b || b.workerId !== user.id) return { error: "Only the worker can start the job." };
  if (b.status !== "CONFIRMED") return { error: "This booking can't be started." };
  await db.booking.update({ where: { id: b.id }, data: { status: "IN_PROGRESS" } });
  await notify(b.clientId, { type: "BOOKING_STARTED", title: "Work started", body: `Work on "${b.job.title}" has started.`, link: `/bookings/${b.id}` });
  revalidatePath(`/bookings/${b.id}`);
  return { ok: "Marked as started." };
}

export async function workerDoneAction(bookingId: string): Promise<R> {
  const user = await requireUser();
  const b = await load(bookingId, user.id);
  if (!b || b.workerId !== user.id) return { error: "Only the worker can mark work as done." };
  if (!["CONFIRMED", "IN_PROGRESS"].includes(b.status)) return { error: "This booking isn't active." };
  await db.booking.update({ where: { id: b.id }, data: { workerDoneAt: new Date(), status: "IN_PROGRESS" } });
  await notify(b.clientId, { type: "WORK_DONE", title: "Worker marked the job done", body: `Please confirm completion for "${b.job.title}" and release payment.`, link: `/bookings/${b.id}` });
  revalidatePath(`/bookings/${b.id}`);
  return { ok: "Client has been asked to confirm completion." };
}

/** Client confirms completion and pays (TEST MODE — no real gateway yet). */
export async function confirmAndPayAction(bookingId: string): Promise<R> {
  const user = await requireUser();
  const b = await load(bookingId, user.id);
  if (!b || b.clientId !== user.id) return { error: "Only the client can confirm completion." };
  if (!["CONFIRMED", "IN_PROGRESS"].includes(b.status)) return { error: "This booking isn't active." };
  const { commission, workerEarning } = splitPayment(b.amount);
  await db.$transaction(async (tx) => {
    const res = await tx.booking.updateMany({ where: { id: b.id, status: { in: ["CONFIRMED", "IN_PROGRESS"] } }, data: { status: "COMPLETED", clientDoneAt: new Date() } });
    if (!res.count) throw new AllocationError("Already completed.");
    await tx.payment.create({ data: { bookingId: b.id, amount: b.amount, commission, workerEarning, status: "PAID", provider: "TEST_MODE", providerRef: `test_${Date.now().toString(36)}` } });
    await tx.workerProfile.update({ where: { userId: b.workerId }, data: { completedJobs: { increment: 1 } } });
    await recomputeReliability(b.workerId, tx);
    const remaining = await tx.booking.count({ where: { jobId: b.jobId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } } });
    const job = await tx.job.findUniqueOrThrow({ where: { id: b.jobId } });
    if (!remaining && job.status === "FILLED") await tx.job.update({ where: { id: b.jobId }, data: { status: "COMPLETED" } });
    await notify(b.workerId, { type: "PAYMENT", title: "Payment received (test mode)", body: `₹${workerEarning} credited for "${b.job.title}" after ₹${commission} platform fee.`, link: `/bookings/${b.id}` }, tx);
  }).catch((e) => { if (!(e instanceof AllocationError)) throw e; });
  revalidatePath(`/bookings/${b.id}`);
  return { ok: "Completed and paid (test mode)." };
}

export async function cancelBookingAction(bookingId: string, reason: string): Promise<R> {
  const user = await requireUser();
  const r = reason.trim();
  if (r.length < 3) return { error: "Please give a short reason." };
  try {
    await cancelBooking(bookingId, user.id, r.slice(0, 300));
  } catch (e) {
    if (e instanceof AllocationError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/bookings/${bookingId}`);
  return { ok: "Booking cancelled." };
}

export async function reviewAction(bookingId: string, _: R, form: FormData): Promise<R> {
  const user = await requireUser();
  const b = await load(bookingId, user.id);
  if (!b) return { error: "Booking not found." };
  if (b.status !== "COMPLETED") return { error: "You can review after the job is completed." };
  const rating = Number(form.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Pick a rating from 1 to 5." };
  const comment = String(form.get("comment") ?? "").trim().slice(0, 1000) || null;
  const targetId = b.clientId === user.id ? b.workerId : b.clientId;
  const exists = await db.review.findUnique({ where: { bookingId_authorId: { bookingId: b.id, authorId: user.id } } });
  if (exists) return { error: "You already reviewed this booking." };
  await db.$transaction(async (tx) => {
    await tx.review.create({ data: { bookingId: b.id, authorId: user.id, targetId, rating, comment } });
    if (targetId === b.workerId) {
      const agg = await tx.review.aggregate({ where: { targetId, booking: { workerId: targetId } }, _avg: { rating: true }, _count: true });
      await tx.workerProfile.update({ where: { userId: targetId }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count } });
      await recomputeReliability(targetId, tx);
    }
    await notify(targetId, { type: "REVIEW", title: `New ${rating}★ review`, body: comment ?? "You received a rating.", link: `/workers/${targetId}` }, tx);
  });
  revalidatePath(`/bookings/${b.id}`);
  return { ok: "Thanks for the review!" };
}

export async function sendMessageAction(bookingId: string, _: R, form: FormData): Promise<R> {
  const user = await requireUser();
  const body = String(form.get("body") ?? "").trim();
  const attachmentUrl = String(form.get("attachmentUrl") ?? "").trim();
  if (!body && !attachmentUrl) return { error: "Type a message." };
  if (body.length > 2000) return { error: "Message is too long." };
  if (attachmentUrl && !/^https?:\/\//.test(attachmentUrl)) return { error: "Attachment must be a link." };
  const conv = await db.conversation.findUnique({ where: { bookingId }, include: { members: true } });
  if (!conv || !conv.members.some((m) => m.userId === user.id)) return { error: "Conversation not found." };
  await db.message.create({ data: { conversationId: conv.id, senderId: user.id, body: body || "📎 Attachment", attachmentUrl: attachmentUrl || null } });
  const other = conv.members.find((m) => m.userId !== user.id);
  if (other) await notify(other.userId, { type: "MESSAGE", title: `Message from ${user.name}`, body: body.slice(0, 120) || "Sent an attachment", link: `/bookings/${bookingId}#chat` });
  revalidatePath(`/bookings/${bookingId}`);
  return { ok: "sent" };
}

export async function disputeAction(bookingId: string, _: R, form: FormData): Promise<R> {
  const user = await requireUser();
  const b = await load(bookingId, user.id);
  if (!b) return { error: "Booking not found." };
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 10) return { error: "Describe the issue (10+ characters)." };
  const open = await db.dispute.findFirst({ where: { bookingId, status: "OPEN" } });
  if (open) return { error: "A dispute is already open for this booking." };
  await db.dispute.create({ data: { bookingId, raisedById: user.id, reason: reason.slice(0, 2000) } });
  revalidatePath(`/bookings/${bookingId}`);
  return { ok: "Dispute raised. Our team will review it." };
}

export async function reportUserAction(targetId: string, _: R, form: FormData): Promise<R> {
  const user = await requireUser();
  if (targetId === user.id) return { error: "You can't report yourself." };
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 10) return { error: "Describe the problem (10+ characters)." };
  await db.report.create({ data: { reporterId: user.id, targetId, reason: reason.slice(0, 1000) } });
  return { ok: "Report submitted. Thank you for keeping AllWork safe." };
}
