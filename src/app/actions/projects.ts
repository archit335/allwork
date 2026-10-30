"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureSkills } from "@/lib/skills";
import { notify } from "@/lib/notify";

type R = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

const ProjectSchema = z.object({
  name: z.string().trim().min(3, "Name your project").max(100),
  description: z.string().trim().min(30, "Describe the project (30+ characters)").max(5000),
  category: z.string().trim().min(2, "Pick a category").max(60),
  stage: z.enum(["Idea", "Prototype", "MVP", "Launched", "Growing"]),
  collabType: z.enum(["PAID", "UNPAID_VOLUNTARY", "REVENUE_SHARE", "EQUITY", "OPEN_SOURCE", "LEARNING"]),
  compensationTerms: z.string().trim().min(10, "Explain the compensation terms clearly (10+ characters)").max(1000),
  skills: z.string().transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)).pipe(z.array(z.string().max(60)).min(1, "Add at least one skill").max(12)),
  contributorsNeeded: z.coerce.number().int().min(1).max(100),
  duration: z.string().trim().max(80).optional(),
  isRemote: z.preprocess((v) => v === "on", z.boolean()),
  city: z.string().trim().max(60).optional(),
  workingHours: z.string().trim().max(80).optional(),
  responsibilities: z.string().trim().max(3000).optional(),
});

export async function createProjectAction(_: R, form: FormData): Promise<R> {
  const user = await requireUser();
  const parsed = ProjectSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { error: "Please fix the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  if (!d.isRemote && !d.city) return { fieldErrors: { city: "Add a city or mark as remote" } };
  if (form.get("ack") !== "on") return { fieldErrors: { ack: "Please confirm the compensation terms are accurate" } };
  const skills = await ensureSkills(d.skills, d.category);
  const project = await db.project.create({
    data: {
      ownerId: user.id, name: d.name, description: d.description, category: d.category, stage: d.stage, collabType: d.collabType,
      compensationTerms: d.compensationTerms, contributorsNeeded: d.contributorsNeeded, duration: d.duration || null, isRemote: d.isRemote,
      city: d.isRemote ? null : d.city || null, workingHours: d.workingHours || null, responsibilities: d.responsibilities || null,
      skills: { create: skills.map((s) => ({ skillId: s.id })) },
    },
  });
  redirect(`/projects/${project.id}?created=1`);
}

export async function applyProjectAction(projectId: string, _: R, form: FormData): Promise<R> {
  const user = await requireUser();
  const message = String(form.get("message") ?? "").trim();
  const role = String(form.get("role") ?? "").trim().slice(0, 80) || null;
  if (message.length < 20) return { error: "Tell the owner why you're a good fit (20+ characters)." };
  if (form.get("ack") !== "on") return { error: "Please confirm you've read the compensation terms." };
  const p = await db.project.findUnique({ where: { id: projectId } });
  if (!p || p.status !== "OPEN") return { error: "This project isn't accepting applications." };
  if (p.ownerId === user.id) return { error: "This is your project." };
  const existing = await db.projectApplication.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
  if (existing && existing.status !== "WITHDRAWN") return { error: "You've already applied." };
  await db.projectApplication.upsert({
    where: { projectId_userId: { projectId, userId: user.id } },
    create: { projectId, userId: user.id, message: message.slice(0, 2000), role },
    update: { message: message.slice(0, 2000), role, status: "PENDING" },
  });
  await notify(p.ownerId, { type: "PROJECT_APPLICATION", title: "New contributor application", body: `${user.name} applied to "${p.name}".`, link: `/projects/${p.id}` });
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Application sent! You'll be notified when the owner responds." };
}

export async function decideApplicationAction(applicationId: string, decision: "ACCEPTED" | "REJECTED"): Promise<R> {
  const user = await requireUser();
  const a = await db.projectApplication.findUnique({ where: { id: applicationId }, include: { project: true } });
  if (!a || a.project.ownerId !== user.id) return { error: "Application not found." };
  if (a.status !== "PENDING") return { error: "Already decided." };
  if (decision === "ACCEPTED") {
    const accepted = await db.projectApplication.count({ where: { projectId: a.projectId, status: "ACCEPTED" } });
    if (accepted >= a.project.contributorsNeeded) return { error: "You've already accepted the number of contributors you asked for. Increase the count or close the project." };
  }
  await db.projectApplication.update({ where: { id: a.id }, data: { status: decision } });
  await notify(a.userId, {
    type: "PROJECT_DECISION",
    title: decision === "ACCEPTED" ? "You're in! 🎉" : "Application update",
    body: decision === "ACCEPTED" ? `You've been accepted to collaborate on "${a.project.name}".` : `"${a.project.name}" went with other contributors this time.`,
    link: `/projects/${a.projectId}`,
  });
  revalidatePath(`/projects/${a.projectId}`);
  return { ok: decision === "ACCEPTED" ? "Contributor accepted." : "Application declined." };
}

export async function withdrawApplicationAction(projectId: string): Promise<R> {
  const user = await requireUser();
  await db.projectApplication.updateMany({ where: { projectId, userId: user.id, status: { in: ["PENDING", "ACCEPTED"] } }, data: { status: "WITHDRAWN" } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Withdrawn." };
}

export async function toggleProjectStatusAction(projectId: string): Promise<R> {
  const user = await requireUser();
  const p = await db.project.findUnique({ where: { id: projectId } });
  if (!p || p.ownerId !== user.id) return { error: "Project not found." };
  await db.project.update({ where: { id: projectId }, data: { status: p.status === "OPEN" ? "CLOSED" : "OPEN" } });
  revalidatePath(`/projects/${projectId}`);
  return { ok: p.status === "OPEN" ? "Project closed to new applications." : "Project reopened." };
}

export async function inviteContributorAction(projectId: string, userId: string): Promise<R> {
  const user = await requireUser();
  const p = await db.project.findUnique({ where: { id: projectId } });
  if (!p || p.ownerId !== user.id) return { error: "Project not found." };
  await notify(userId, { type: "PROJECT_INVITE", title: "You're invited to a project", body: `${user.name} thinks you'd be great for "${p.name}". Check the terms and apply if interested.`, link: `/projects/${p.id}` });
  return { ok: "Invitation sent." };
}
