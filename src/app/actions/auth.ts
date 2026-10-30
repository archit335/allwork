"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { resolveCity } from "@/lib/geo";
import { sendSms, SMS_DEMO_MODE } from "@/lib/sms";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: string; demoCode?: string } | undefined;

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

function safeNext(n: FormDataEntryValue | null) {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().transform((p, ctx) => {
    const n = normalizePhone(p);
    if (!n) ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" });
    return n ?? "";
  }),
  city: z.string().trim().min(2, "Enter your city").max(60),
  password: z.string().min(8, "Use at least 8 characters").max(100),
});

async function issueOtp(userId: string, phone: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.otpCode.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  await db.otpCode.create({ data: { userId, codeHash: await bcrypt.hash(code, 8), demoCode: SMS_DEMO_MODE ? code : null, expiresAt: new Date(Date.now() + 10 * 60_000) } });
  await sendSms(phone, `Your AllWork verification code is ${code}. Valid for 10 minutes.`);
  return code;
}

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, phone, city, password } = parsed.data;

  if (await db.user.findUnique({ where: { phone } })) return { fieldErrors: { phone: "An account with this number already exists. Log in instead." } };

  const geo = resolveCity(city);
  const user = await db.user.create({
    data: {
      name, phone, city: geo?.name ?? city, lat: geo?.lat, lng: geo?.lng,
      passwordHash: await bcrypt.hash(password, 10),
      workerProfile: { create: { preferredLocations: [geo?.name ?? city] } },
    },
  });
  await issueOtp(user.id, phone);
  await createSession(user.id);
  redirect(`/verify?next=${encodeURIComponent(safeNext(form.get("next")))}`);
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!phone || !password) return { error: "Enter your mobile number and password." };
  const user = await db.user.findUnique({ where: { phone } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Wrong mobile number or password." };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function verifyOtpAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const code = String(form.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };
  const otp = await db.otpCode.findFirst({ where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!otp) return { error: "Code expired. Request a new one." };
  if (otp.attempts >= 5) return { error: "Too many attempts. Request a new code." };
  if (!(await bcrypt.compare(code, otp.codeHash))) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { error: "That code is incorrect." };
  }
  await db.$transaction([
    db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: user.id }, data: { phoneVerified: true } }),
  ]);
  redirect(safeNext(form.get("next")));
}

export async function resendOtpAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const recent = await db.otpCode.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent) return { error: "Please wait a minute before requesting another code." };
  const code = await issueOtp(user.id, user.phone);
  return { ok: "A new code was sent.", demoCode: SMS_DEMO_MODE ? code : undefined };
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
