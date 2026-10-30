import "server-only";
import type { Job, WorkType } from "@prisma/client";
import { db } from "./db";
import { haversineKm, resolveCity } from "./geo";
import { notifyMany } from "./notify";

// Matching weights. Expandable: add a factor here + a scorer below.
export const WEIGHTS = {
  skill: 0.35,
  location: 0.2,
  availability: 0.1,
  experience: 0.1,
  reliability: 0.1,
  verification: 0.05,
  performance: 0.05,
  preference: 0.05,
} as const;

export type Factor = keyof typeof WEIGHTS;
export type Breakdown = Record<Factor, number>;

const MIN_SCORE = 0.35;

type Candidate = {
  id: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  phoneVerified: boolean;
  idVerified: boolean;
  skills: { skillId: string; years: number; skill: { category: string } }[];
  workerProfile: {
    experienceYears: number;
    workRadiusKm: number;
    remoteOk: boolean;
    preferredLocations: string[];
    workTypes: WorkType[];
    reliabilityScore: number;
    ratingAvg: number;
    ratingCount: number;
    emergencyAvailable: boolean;
  } | null;
  weeklySlots: { dayOfWeek: number; startMin: number; endMin: number }[];
  calendarBlocks: { start: Date; end: Date; type: string }[];
};

type JobForMatch = Pick<
  Job,
  "id" | "clientId" | "workType" | "city" | "lat" | "lng" | "isRemote" | "startDate" | "durationHours" | "urgency" | "workersNeeded" | "title"
> & { skills: { skillId: string; skill: { category: string } }[] };

export function jobWindow(job: Pick<Job, "startDate" | "startTime" | "durationHours">) {
  if (!job.startDate) return null;
  const start = new Date(job.startDate);
  if (job.startTime) {
    const [h, m] = job.startTime.split(":").map(Number);
    start.setHours(h ?? 9, m ?? 0, 0, 0);
  } else start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + (job.durationHours ?? 8) * 3600_000);
  return { start, end };
}

/** Score a single worker for a job. Returns null if the worker is ineligible. */
export function scoreWorker(job: JobForMatch & { startTime?: string | null }, w: Candidate) {
  const p = w.workerProfile;
  if (!p) return null;

  // 1. Skill match — exact skill = 1, same category = partial
  const jobSkillIds = new Set(job.skills.map((s) => s.skillId));
  const jobCats = new Set(job.skills.map((s) => s.skill.category));
  let exact = 0;
  let catHit = false;
  let skillYears = 0;
  for (const us of w.skills) {
    if (jobSkillIds.has(us.skillId)) {
      exact++;
      skillYears = Math.max(skillYears, us.years);
    } else if (jobCats.has(us.skill.category)) catHit = true;
  }
  const skill = jobSkillIds.size ? (exact ? Math.min(1, 0.6 + (0.4 * exact) / jobSkillIds.size) : catHit ? 0.3 : 0) : 0.5;
  if (skill === 0) return null;

  // 2. Location & working radius
  let location = 1;
  let distanceKm: number | null = null;
  if (!job.isRemote) {
    const jobPt = job.lat != null && job.lng != null ? { lat: job.lat, lng: job.lng } : resolveCity(job.city);
    const wPt = w.lat != null && w.lng != null ? { lat: w.lat, lng: w.lng } : resolveCity(w.city);
    const prefers = !!job.city && p.preferredLocations.some((l) => l.toLowerCase() === job.city!.toLowerCase());
    if (jobPt && wPt) {
      distanceKm = Math.round(haversineKm(jobPt, wPt) * 10) / 10;
      const limit = Math.max(p.workRadiusKm, 5) * 1.5;
      if (distanceKm > limit && !prefers) return null;
      location = prefers ? Math.max(0.8, 1 - distanceKm / (limit * 2)) : Math.max(0, 1 - distanceKm / limit);
    } else if (job.city && w.city) {
      if (job.city.toLowerCase() !== w.city.toLowerCase() && !prefers) return null;
    } else location = 0.5;
  } else {
    location = p.remoteOk ? 1 : 0.4;
  }

  // 3. Availability — hard-block conflicting bookings / busy slots
  let availability = 0.7;
  const win = jobWindow({ startDate: job.startDate, startTime: job.startTime ?? null, durationHours: job.durationHours });
  if (win) {
    const clash = w.calendarBlocks.some((b) => b.type !== "AVAILABLE_EXTRA" && b.start < win.end && b.end > win.start);
    if (clash) return null;
    const extra = w.calendarBlocks.some((b) => b.type === "AVAILABLE_EXTRA" && b.start <= win.start && b.end >= win.end);
    const day = win.start.getDay();
    const startMin = win.start.getHours() * 60 + win.start.getMinutes();
    if (extra) availability = 1;
    else if (w.weeklySlots.length) {
      const daySlots = w.weeklySlots.filter((s) => s.dayOfWeek === day);
      availability = daySlots.some((s) => s.startMin <= startMin && s.endMin > startMin) ? 1 : daySlots.length ? 0.6 : 0.2;
    }
    if (job.urgency === "URGENT" && p.emergencyAvailable) availability = Math.max(availability, 0.9);
  }

  // 4–8. Experience, reliability, verification, performance, preferences
  const experience = Math.min(1, Math.max(p.experienceYears, skillYears) / 6);
  const reliability = p.reliabilityScore / 100;
  const verification = (w.phoneVerified ? 0.5 : 0) + (w.idVerified ? 0.5 : 0);
  const performance = p.ratingCount ? p.ratingAvg / 5 : 0.6;
  const preference = !p.workTypes.length || p.workTypes.includes(job.workType) ? 1 : 0.4;

  const breakdown: Breakdown = { skill, location, availability, experience, reliability, verification, performance, preference };
  const score = (Object.keys(WEIGHTS) as Factor[]).reduce((acc, f) => acc + WEIGHTS[f] * breakdown[f], 0);
  if (score < MIN_SCORE) return null;
  return { score: Math.round(score * 1000) / 1000, breakdown, distanceKm };
}

const candidateSelect = {
  id: true, city: true, lat: true, lng: true, phoneVerified: true, idVerified: true,
  skills: { select: { skillId: true, years: true, skill: { select: { category: true } } } },
  workerProfile: {
    select: {
      experienceYears: true, workRadiusKm: true, remoteOk: true, preferredLocations: true, workTypes: true,
      reliabilityScore: true, ratingAvg: true, ratingCount: true, emergencyAvailable: true,
    },
  },
  weeklySlots: { select: { dayOfWeek: true, startMin: true, endMin: true } },
} as const;

/** Rank workers for a job without dispatching. Used by "Hire Talent" recommendations too. */
export async function rankWorkersForJob(jobId: string, opts: { excludeIds?: string[]; limit?: number } = {}) {
  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { skills: { select: { skillId: true, skill: { select: { category: true } } } } },
  });
  const skillIds = job.skills.map((s) => s.skillId);
  const categories = [...new Set(job.skills.map((s) => s.skill.category))];
  const win = jobWindow(job);

  const candidates = await db.user.findMany({
    where: {
      id: { notIn: [job.clientId, ...(opts.excludeIds ?? [])] },
      workerProfile: { isAvailable: true },
      skills: { some: { OR: [{ skillId: { in: skillIds } }, { skill: { category: { in: categories } } }] } },
    },
    select: {
      ...candidateSelect,
      calendarBlocks: win
        ? { where: { start: { lt: win.end }, end: { gt: win.start } }, select: { start: true, end: true, type: true } }
        : { where: { id: "__none__" }, select: { start: true, end: true, type: true } },
    },
    take: 2000,
  });

  const ranked = candidates
    .map((c) => ({ workerId: c.id, result: scoreWorker(job, c) }))
    .filter((r): r is { workerId: string; result: NonNullable<ReturnType<typeof scoreWorker>> } => r.result !== null)
    .sort((a, b) => b.result.score - a.result.score);

  return { job, ranked: opts.limit ? ranked.slice(0, opts.limit) : ranked };
}

/**
 * Dispatch a wave of work requests to the best-matching workers who have not
 * been contacted yet. Returns how many workers were notified.
 */
export async function dispatchWave(jobId: string) {
  const already = await db.jobMatch.findMany({ where: { jobId }, select: { workerId: true, wave: true } });
  const wave = already.reduce((m, a) => Math.max(m, a.wave), 0) + 1;
  const { job, ranked } = await rankWorkersForJob(jobId, { excludeIds: already.map((a) => a.workerId) });
  if (job.status !== "OPEN") return 0;

  const waveSize = Math.min(50, Math.max(5, job.workersNeeded * 3));
  const pick = ranked.slice(0, waveSize);
  if (!pick.length) {
    await db.allocationEvent.create({ data: { jobId, type: "NO_MATCHES", detail: `Wave ${wave}: no new eligible workers found` } });
    return 0;
  }

  await db.$transaction(async (tx) => {
    await tx.jobMatch.createMany({
      data: pick.map((p) => ({
        jobId, workerId: p.workerId, score: p.result.score, breakdown: p.result.breakdown, distanceKm: p.result.distanceKm, wave,
      })),
      skipDuplicates: true,
    });
    await notifyMany(
      pick.map((p) => p.workerId),
      {
        type: "WORK_REQUEST",
        title: "NEW WORK REQUEST!",
        body: `${job.title}${job.city ? ` · ${job.city}` : ""} — be the first to accept`,
        link: "/dashboard/requests",
      },
      tx,
    );
    await tx.allocationEvent.create({ data: { jobId, type: "DISPATCHED", detail: `Wave ${wave}: sent to ${pick.length} workers` } });
  });
  return pick.length;
}
