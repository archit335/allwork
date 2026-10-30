"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { extractJob } from "@/lib/ai/extract";
import type { ExtractionResult } from "@/lib/ai/schema";
import { WORK_TYPES } from "@/lib/ai/schema";
import { ensureSkills } from "@/lib/skills";
import { resolveCity } from "@/lib/geo";
import { dispatchWave, rankWorkersForJob } from "@/lib/matching";
import {
  AllocationError, acceptRequest, rejectRequest, submitProposal, withdrawReservation,
  declineProposal, selectProposal, sweepExpiredReservations,
} from "@/lib/allocation";

export type ActionResult = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

export async function analyzeWorkAction(text: string): Promise<{ error?: string; result?: ExtractionResult }> {
  const t = text.trim();
  if (t.length < 5) return { error: "Describe the work in a few words." };
  if (t.length > 3000) return { error: "Please keep the description under 3000 characters." };
  const result = await extractJob(t);
  if (!result.job.isLegitimate) return { error: "This request can't be posted on AllWork. Please describe a legitimate task." };
  return { result };
}

const optInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(100_000_000).nullable());

const JobSchema = z.object({
  title: z.string().trim().min(3, "Add a short title").max(120),
  description: z.string().trim().min(10, "Describe the work (10+ characters)").max(5000),
  rawRequest: z.string().max(3000).optional(),
  category: z.string().trim().min(2).max(60),
  skills: z.string().transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)).pipe(z.array(z.string().max(60)).min(1, "Add at least one skill").max(10)),
  workersNeeded: z.coerce.number().int().min(1, "At least 1").max(1000),
  city: z.string().trim().max(60).optional(),
  address: z.string().trim().max(200).optional(),
  isRemote: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  startDate: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  durationHours: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0.5).max(2000).nullable()),
  durationText: z.string().trim().max(60).optional(),
  budgetMin: optInt,
  budgetMax: optInt,
  budgetUnit: z.enum(["HOUR", "DAY", "TOTAL", "MONTH", ""]).optional(),
  workType: z.enum(WORK_TYPES),
  experienceRequired: z.string().trim().max(80).optional(),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  specialInstructions: z.string().trim().max(2000).optional(),
  attachments: z.string().optional(),
  aiSource: z.string().optional(),
});

export async function createJobAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to publish. Your draft is kept on this page." };
  const parsed = JobSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  if (!d.isRemote && !d.city) return { error: "Add a city or mark the work as remote.", fieldErrors: { city: "Required for on-site work" } };
  if (d.budgetMin != null && d.budgetMax != null && d.budgetMin > d.budgetMax) return { fieldErrors: { budgetMax: "Max must be ≥ min" }, error: "Please fix the budget." };
  let startDate: Date | null = null;
  if (d.startDate) {
    startDate = new Date(`${d.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return { fieldErrors: { startDate: "Invalid date" } };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (startDate < today) return { fieldErrors: { startDate: "Date can't be in the past" }, error: "Please fix the date." };
  }

  const geo = d.isRemote ? null : resolveCity(d.city);
  const skills = await ensureSkills(d.skills, d.category);
  const attachments = (d.attachments ?? "").split(/\s+/).filter((u) => /^https?:\/\//.test(u)).slice(0, 10);

  const job = await db.job.create({
    data: {
      clientId: user.id,
      title: d.title,
      description: d.description,
      rawRequest: d.rawRequest || null,
      category: d.category,
      workType: d.workType,
      workersNeeded: d.workersNeeded,
      city: d.isRemote ? null : (geo?.name ?? d.city ?? null),
      address: d.address || null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      isRemote: d.isRemote,
      startDate,
      startTime: d.startTime || null,
      durationHours: d.durationHours,
      durationText: d.durationText || null,
      budgetMin: d.budgetMin,
      budgetMax: d.budgetMax ?? d.budgetMin,
      budgetUnit: d.budgetUnit || null,
      experienceRequired: d.experienceRequired || null,
      urgency: d.urgency,
      specialInstructions: d.specialInstructions || null,
      attachments,
      aiSource: d.aiSource || null,
      skills: { create: skills.map((s) => ({ skillId: s.id })) },
      allocationEvents: { create: { type: "POSTED", detail: `${d.workersNeeded} position(s)` } },
    },
  });
  await dispatchWave(job.id);
  redirect(`/jobs/${job.id}?posted=1`);
}

function wrap(fn: () => Promise<unknown>, paths: string[]): Promise<ActionResult> {
  return fn()
    .then(() => {
      paths.forEach((p) => revalidatePath(p));
      return { ok: "Done" } as ActionResult;
    })
    .catch((e) => {
      if (e instanceof AllocationError) return { error: e.message };
      throw e;
    });
}

export async function acceptRequestAction(jobId: string): Promise<ActionResult & { status?: string; position?: number | null }> {
  const user = await requireUser();
  try {
    const r = await acceptRequest(jobId, user.id);
    revalidatePath("/dashboard/requests");
    return r.status === "waitlisted"
      ? { status: r.status, ok: "All positions are currently reserved. You're on the waitlist — we'll alert you if a spot opens." }
      : { status: r.status, position: r.position, ok: `Position ${r.position} reserved! Submit your price & availability before it expires.` };
  } catch (e) {
    if (e instanceof AllocationError) return { error: e.message };
    throw e;
  }
}

export async function rejectRequestAction(jobId: string): Promise<ActionResult> {
  const user = await requireUser();
  return wrap(() => rejectRequest(jobId, user.id), ["/dashboard/requests"]);
}

/** A worker browsing open work asks to be considered — scored by the same engine. */
export async function expressInterestAction(jobId: string): Promise<ActionResult> {
  const user = await requireUser();
  const exists = await db.jobMatch.findUnique({ where: { jobId_workerId: { jobId, workerId: user.id } } });
  if (exists) return { ok: "This job is already in your requests." };
  const { job, ranked } = await rankWorkersForJob(jobId);
  if (job.clientId === user.id) return { error: "You posted this job." };
  if (job.status !== "OPEN") return { error: "This job is no longer open." };
  const me = ranked.find((r) => r.workerId === user.id);
  if (!me) return { error: "Your profile doesn't match this job yet (skills, location, availability). Update your profile to qualify." };
  await db.jobMatch.create({ data: { jobId, workerId: user.id, score: me.result.score, breakdown: me.result.breakdown, distanceKm: me.result.distanceKm, wave: 0 } });
  revalidatePath(`/jobs/${jobId}`);
  return { ok: "You qualify! Accept the request to reserve a position." };
}

const ProposalSchema = z.object({
  pricingType: z.enum(["HOURLY", "DAILY", "FIXED"]),
  rate: z.coerce.number().int().min(1, "Enter your rate").max(10_000_000),
  extraCharges: z.preprocess((v) => (v === "" ? 0 : v), z.coerce.number().int().min(0).max(10_000_000)),
  availableDate: z.string().min(1, "Pick a date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time"),
  estimatedCompletion: z.string().max(120).optional(),
  note: z.string().max(1000).optional(),
});

export async function submitProposalAction(jobId: string, _: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ProposalSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  if (d.endTime <= d.startTime) return { fieldErrors: { endTime: "End must be after start" }, error: "Please fix the time." };
  const date = new Date(`${d.availableDate}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime()) || date < today) return { fieldErrors: { availableDate: "Choose today or a future date" } };
  try {
    await submitProposal(jobId, user.id, { ...d, availableDate: date, estimatedCompletion: d.estimatedCompletion || null, note: d.note || null });
  } catch (e) {
    if (e instanceof AllocationError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/jobs/${jobId}`);
  return { ok: "Proposal sent! The client will compare and choose." };
}

export async function withdrawAction(jobId: string): Promise<ActionResult> {
  const user = await requireUser();
  return wrap(() => withdrawReservation(jobId, user.id), [`/jobs/${jobId}`, "/dashboard/requests"]);
}

export async function declineProposalAction(jobId: string, proposalId: string): Promise<ActionResult> {
  const user = await requireUser();
  return wrap(() => declineProposal(proposalId, user.id), [`/jobs/${jobId}`]);
}

export async function selectProposalAction(proposalId: string): Promise<ActionResult> {
  const user = await requireUser();
  let bookingId: string;
  try {
    bookingId = (await selectProposal(proposalId, user.id)).id;
  } catch (e) {
    if (e instanceof AllocationError) return { error: e.message };
    throw e;
  }
  redirect(`/bookings/${bookingId}?new=1`);
}

export async function redispatchAction(jobId: string): Promise<ActionResult> {
  const user = await requireUser();
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.clientId !== user.id) return { error: "Job not found." };
  await sweepExpiredReservations(jobId);
  const n = await dispatchWave(jobId);
  revalidatePath(`/jobs/${jobId}`);
  return n ? { ok: `Request sent to ${n} more matching workers.` } : { error: "No new matching workers found right now. Try widening location or skills." };
}

export async function cancelJobAction(jobId: string): Promise<ActionResult> {
  const user = await requireUser();
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.clientId !== user.id) return { error: "Job not found." };
  if (job.status !== "OPEN") return { error: "Only open jobs can be cancelled here. Cancel individual bookings instead." };
  const workers = await db.reservation.findMany({ where: { jobId, status: { in: ["HELD", "PROPOSED"] } }, select: { workerId: true } });
  await db.$transaction([
    db.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } }),
    db.reservation.updateMany({ where: { jobId, status: { in: ["HELD", "PROPOSED"] } }, data: { status: "RELEASED" } }),
    db.proposal.updateMany({ where: { jobId, status: "SUBMITTED" }, data: { status: "REJECTED" } }),
    db.jobMatch.updateMany({ where: { jobId, status: { in: ["SENT", "WAITLISTED"] } }, data: { status: "EXPIRED" } }),
    db.allocationEvent.create({ data: { jobId, type: "JOB_CANCELLED", detail: "Client cancelled the job" } }),
    db.notification.createMany({ data: workers.map((w) => ({ userId: w.workerId, type: "JOB_CANCELLED", title: "Job cancelled", body: `"${job.title}" was cancelled by the client.`, link: `/jobs/${jobId}` })) }),
  ]);
  revalidatePath(`/jobs/${jobId}`);
  return { ok: "Job cancelled." };
}

