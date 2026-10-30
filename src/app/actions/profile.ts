"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveCity } from "@/lib/geo";
import { ensureSkills } from "@/lib/skills";
import { hhmmToMin } from "@/lib/utils";
import { WORK_TYPES } from "@/lib/ai/schema";

export type ProfileState = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

const list = (max: number) =>
  z.string().optional().transform((s) => (s ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, max));

const ProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.union([z.literal(""), z.string().trim().email("Invalid email")]).optional(),
  city: z.string().trim().min(2, "Enter your city").max(60),
  area: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(1000).optional(),
  avatarUrl: z.union([z.literal(""), z.string().url("Must be a link")]).optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  headline: z.string().trim().max(120).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60),
  education: z.string().trim().max(200).optional(),
  languages: list(10),
  certifications: list(20),
  portfolioLinks: list(10).pipe(z.array(z.string().url("Portfolio entries must be links (https://…)"))),
  previousWork: z.string().trim().max(2000).optional(),
  preferredLocations: list(10),
  workRadiusKm: z.coerce.number().int().min(1).max(500),
  remoteOk: z.preprocess((v) => v === "on", z.boolean()),
  isAvailable: z.preprocess((v) => v === "on", z.boolean()),
  emergencyAvailable: z.preprocess((v) => v === "on", z.boolean()),
  hourlyRate: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(0).max(1_000_000).nullable()),
  dailyRate: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(0).max(1_000_000).nullable()),
  expectedComp: z.string().trim().max(120).optional(),
});

export async function updateProfileAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const raw = Object.fromEntries(form);
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  const workTypes = form.getAll("workTypes").map(String).filter((w): w is (typeof WORK_TYPES)[number] => (WORK_TYPES as readonly string[]).includes(w));
  if (d.email) {
    const taken = await db.user.findFirst({ where: { email: d.email, NOT: { id: user.id } } });
    if (taken) return { fieldErrors: { email: "This email is used by another account" } };
  }
  const gps = d.lat && d.lng ? { lat: Number(d.lat), lng: Number(d.lng) } : null;
  const geo = resolveCity(d.city);
  const coords = gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lng) ? gps : geo ? { lat: geo.lat, lng: geo.lng } : { lat: null, lng: null };

  const wp = {
    headline: d.headline || null, experienceYears: d.experienceYears, education: d.education || null,
    languages: d.languages, certifications: d.certifications, portfolioLinks: d.portfolioLinks, previousWork: d.previousWork || null,
    preferredLocations: d.preferredLocations, workRadiusKm: d.workRadiusKm, remoteOk: d.remoteOk, isAvailable: d.isAvailable,
    emergencyAvailable: d.emergencyAvailable, hourlyRate: d.hourlyRate, dailyRate: d.dailyRate, expectedComp: d.expectedComp || null, workTypes,
  };
  await db.user.update({
    where: { id: user.id },
    data: {
      name: d.name, email: d.email || null, city: geo?.name ?? d.city, area: d.area || null, bio: d.bio || null, avatarUrl: d.avatarUrl || null,
      ...coords,
      workerProfile: { upsert: { create: wp, update: wp } },
    },
  });
  revalidatePath("/dashboard", "layout");
  return { ok: "Profile saved." };
}

export async function addSkillsAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const names = String(form.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const years = Math.max(0, Math.min(60, Number(form.get("years") ?? 0) || 0));
  const level = ["BEGINNER", "INTERMEDIATE", "EXPERT"].includes(String(form.get("level"))) ? String(form.get("level")) : "INTERMEDIATE";
  if (!names.length) return { error: "Type at least one skill." };
  if (names.some((n) => n.length > 60)) return { error: "Skill names must be under 60 characters." };
  const count = await db.userSkill.count({ where: { userId: user.id } });
  if (count + names.length > 30) return { error: "You can list up to 30 skills." };
  const skills = await ensureSkills(names, String(form.get("category") || "Other"));
  for (const s of skills) {
    await db.userSkill.upsert({
      where: { userId_skillId: { userId: user.id, skillId: s.id } },
      create: { userId: user.id, skillId: s.id, years, level },
      update: { years, level },
    });
  }
  revalidatePath("/dashboard/profile");
  return { ok: `Added ${skills.map((s) => s.name).join(", ")}.` };
}

export async function removeSkillAction(skillId: string) {
  const user = await requireUser();
  await db.userSkill.deleteMany({ where: { userId: user.id, skillId } });
  revalidatePath("/dashboard/profile");
}

export async function addWeeklySlotAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const days = form.getAll("days").map(Number).filter((d) => d >= 0 && d <= 6);
  const start = String(form.get("start") ?? "");
  const end = String(form.get("end") ?? "");
  if (!days.length) return { error: "Pick at least one day." };
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) return { error: "End time must be after start time." };
  const s = hhmmToMin(start), e = hhmmToMin(end);
  const overlapping = await db.availabilitySlot.findFirst({ where: { userId: user.id, dayOfWeek: { in: days }, startMin: { lt: e }, endMin: { gt: s } } });
  if (overlapping) return { error: "That overlaps hours you already added for one of those days." };
  await db.availabilitySlot.createMany({ data: days.map((d) => ({ userId: user.id, dayOfWeek: d, startMin: s, endMin: e })) });
  revalidatePath("/dashboard/calendar");
  return { ok: "Weekly hours added." };
}

export async function removeWeeklySlotAction(id: string) {
  const user = await requireUser();
  await db.availabilitySlot.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/calendar");
}

export async function addBlockAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const type = form.get("type") === "AVAILABLE_EXTRA" ? "AVAILABLE_EXTRA" : "BUSY";
  const date = String(form.get("date") ?? "");
  const start = new Date(`${date}T${form.get("start")}:00`);
  const end = new Date(`${date}T${form.get("end")}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return { error: "Pick a valid date and time range." };
  if (end < new Date()) return { error: "That time is already in the past." };
  if (type === "BUSY") {
    const booking = await db.calendarBlock.findFirst({ where: { userId: user.id, type: "BOOKING", start: { lt: end }, end: { gt: start } } });
    if (booking) return { error: "You have a confirmed booking in that slot. Cancel the booking instead." };
  }
  await db.calendarBlock.create({ data: { userId: user.id, start, end, type, note: String(form.get("note") ?? "").slice(0, 120) || null } });
  revalidatePath("/dashboard/calendar");
  return { ok: type === "BUSY" ? "Marked as busy." : "Extra availability added." };
}

export async function removeBlockAction(id: string) {
  const user = await requireUser();
  await db.calendarBlock.deleteMany({ where: { id, userId: user.id, type: { not: "BOOKING" } } });
  revalidatePath("/dashboard/calendar");
}

export async function toggleSaveWorkerAction(workerId: string) {
  const user = await requireUser();
  if (workerId === user.id) return { error: "That's you!" };
  const key = { userId_workerId: { userId: user.id, workerId } };
  const existing = await db.savedWorker.findUnique({ where: key });
  if (existing) await db.savedWorker.delete({ where: key });
  else await db.savedWorker.create({ data: { userId: user.id, workerId } });
  revalidatePath(`/workers/${workerId}`);
  return { ok: existing ? "Removed from saved" : "Saved" };
}

export async function requestVerificationAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const type = String(form.get("type"));
  const details = String(form.get("details") ?? "").trim();
  if (!["IDENTITY", "SKILL", "PORTFOLIO"].includes(type)) return { error: "Choose a verification type." };
  if (details.length < 5) return { error: "Add some details (document type, skill, link…)." };
  const pending = await db.verification.findFirst({ where: { userId: user.id, type, status: "PENDING" } });
  if (pending) return { error: "You already have a pending request of this type." };
  await db.verification.create({ data: { userId: user.id, type, details: details.slice(0, 500) } });
  revalidatePath("/dashboard/profile");
  return { ok: "Verification request submitted. An admin will review it." };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/notifications");
}
