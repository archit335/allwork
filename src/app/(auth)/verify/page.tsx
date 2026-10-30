import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { VerifyForm } from "@/components/forms/auth-forms";
import { Alert } from "@/components/ui";
import { SMS_DEMO_MODE } from "@/lib/sms";

export const metadata = { title: "Verify your number" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const user = await requireUser("/verify");
  const { next } = await searchParams;
  const nextUrl = typeof next === "string" ? next : undefined;
  if (user.phoneVerified) redirect(nextUrl ?? "/dashboard");
  const otp = SMS_DEMO_MODE
    ? await db.otpCode.findFirst({ where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } })
    : null;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Verify your number</h1>
      <p className="mb-6 mt-2 text-stone-600">Enter the code sent to {user.phone}.</p>
      {SMS_DEMO_MODE ? (
        <div className="mb-4">
          <Alert tone="amber">
            <strong>Demo mode:</strong> no SMS provider is configured, so the code is shown here instead of being texted.
            {otp?.demoCode ? <> Your code: <strong className="font-mono text-base tracking-widest">{otp.demoCode}</strong></> : " Request a new code below."}
          </Alert>
        </div>
      ) : null}
      <VerifyForm next={nextUrl} />
    </>
  );
}
