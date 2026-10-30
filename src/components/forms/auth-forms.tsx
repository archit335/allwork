"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, verifyOtpAction, resendOtpAction } from "@/app/actions/auth";
import { Alert, Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/form-button";
import { CITY_NAMES } from "@/lib/geo";

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signupAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <Card className="p-6 sm:p-8">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? "/dashboard/profile?welcome=1"} />
        <Field label="Full name" htmlFor="name" error={fe.name}>
          <Input id="name" name="name" autoComplete="name" required placeholder="Rahul Kumar" />
        </Field>
        <Field label="Mobile number" htmlFor="phone" error={fe.phone} hint="We'll send a one-time code to verify it.">
          <div className="flex">
            <span className="inline-flex h-10 items-center rounded-l-xl border border-r-0 border-stone-300 bg-stone-50 px-3 text-sm text-stone-600">+91</span>
            <Input id="phone" name="phone" inputMode="numeric" autoComplete="tel-national" required placeholder="98765 43210" className="rounded-l-none" />
          </div>
        </Field>
        <Field label="City" htmlFor="city" error={fe.city} hint="Don't see yours? Type it — any city works.">
          <Input id="city" name="city" list="cities" required placeholder="e.g. Gurgaon" />
          <datalist id="cities">{CITY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Password" htmlFor="password" error={fe.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        {state?.error ? <Alert>{state.error}</Alert> : null}
        <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create free account</SubmitButton>
        <p className="text-center text-xs text-stone-500">No degree required. Your skills and work speak for you.</p>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        Already have an account? <Link href="/login" className="font-semibold text-brand-700">Log in</Link>
      </p>
    </Card>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <Card className="p-6 sm:p-8">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <Field label="Mobile number" htmlFor="phone">
          <div className="flex">
            <span className="inline-flex h-10 items-center rounded-l-xl border border-r-0 border-stone-300 bg-stone-50 px-3 text-sm text-stone-600">+91</span>
            <Input id="phone" name="phone" inputMode="numeric" autoComplete="tel-national" required className="rounded-l-none" />
          </div>
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {state?.error ? <Alert>{state.error}</Alert> : null}
        <SubmitButton className="w-full" size="lg" pendingText="Logging in…">Log in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        New here? <Link href="/signup" className="font-semibold text-brand-700">Create a free account</Link>
      </p>
    </Card>
  );
}

export function VerifyForm({ next }: { next?: string }) {
  const [state, action] = useActionState(verifyOtpAction, undefined);
  const [resend, resendAction] = useActionState(resendOtpAction, undefined);
  return (
    <Card className="p-6 sm:p-8">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/dashboard/profile?welcome=1"} />
        <Field label="6-digit code" htmlFor="code">
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="h-12 text-center text-xl tracking-[0.5em]" />
        </Field>
        {state?.error ? <Alert>{state.error}</Alert> : null}
        <SubmitButton className="w-full" size="lg" pendingText="Verifying…">Verify number</SubmitButton>
      </form>
      <form action={resendAction} className="mt-4 text-center">
        <button className="text-sm font-semibold text-brand-700 hover:underline">Resend code</button>
        {resend?.error ? <p className="mt-2 text-xs text-red-600">{resend.error}</p> : null}
        {resend?.ok ? <p className="mt-2 text-xs text-emerald-700">{resend.ok} Refresh to see it below if in demo mode.</p> : null}
      </form>
    </Card>
  );
}
