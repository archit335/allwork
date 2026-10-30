"use client";
import { useActionState, useState } from "react";
import { submitProposalAction } from "@/app/actions/jobs";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/form-button";
import { formatINR } from "@/lib/utils";

type Defaults = {
  pricingType?: string; rate?: number; extraCharges?: number; availableDate?: string; startTime?: string; endTime?: string;
  estimatedCompletion?: string | null; note?: string | null;
};

export function ProposalForm({ jobId, defaults, budgetHint }: { jobId: string; defaults: Defaults; budgetHint?: string }) {
  const [state, action] = useActionState(submitProposalAction.bind(null, jobId), undefined);
  const [v, setV] = useState({
    pricingType: defaults.pricingType ?? "DAILY",
    rate: defaults.rate ? String(defaults.rate) : "",
    extra: defaults.extraCharges ? String(defaults.extraCharges) : "",
    start: defaults.startTime ?? "09:00",
    end: defaults.endTime ?? "17:00",
  });
  const hours = Math.max(0, (toMin(v.end) - toMin(v.start)) / 60);
  const base = v.pricingType === "HOURLY" ? Math.round(Number(v.rate || 0) * hours) : Number(v.rate || 0);
  const total = base + Number(v.extra || 0);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Pricing" htmlFor="pricingType">
        <Select id="pricingType" name="pricingType" value={v.pricingType} onChange={(e) => setV({ ...v, pricingType: e.target.value })}>
          <option value="HOURLY">Hourly rate</option>
          <option value="DAILY">Daily rate</option>
          <option value="FIXED">Total project price</option>
        </Select>
      </Field>
      <Field label={v.pricingType === "HOURLY" ? "Rate per hour (₹)" : v.pricingType === "DAILY" ? "Rate per day (₹)" : "Total price (₹)"} htmlFor="rate" error={fe.rate} hint={budgetHint}>
        <Input id="rate" name="rate" type="number" min={1} required value={v.rate} onChange={(e) => setV({ ...v, rate: e.target.value })} />
      </Field>
      <Field label="Additional charges (₹)" htmlFor="extraCharges" hint="Travel, materials, etc." error={fe.extraCharges}>
        <Input id="extraCharges" name="extraCharges" type="number" min={0} value={v.extra} onChange={(e) => setV({ ...v, extra: e.target.value })} />
      </Field>
      <Field label="Available date" htmlFor="availableDate" error={fe.availableDate}>
        <Input id="availableDate" name="availableDate" type="date" required defaultValue={defaults.availableDate} />
      </Field>
      <Field label="Starting time" htmlFor="startTime" error={fe.startTime}>
        <Input id="startTime" name="startTime" type="time" required value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />
      </Field>
      <Field label="Ending time" htmlFor="endTime" error={fe.endTime}>
        <Input id="endTime" name="endTime" type="time" required value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
      </Field>
      <Field label="Estimated completion" htmlFor="estimatedCompletion" className="sm:col-span-2">
        <Input id="estimatedCompletion" name="estimatedCompletion" defaultValue={defaults.estimatedCompletion ?? ""} placeholder="e.g. Same day, 3 days" />
      </Field>
      <Field label="Note to client" htmlFor="note" className="sm:col-span-2">
        <Textarea id="note" name="note" defaultValue={defaults.note ?? ""} className="min-h-16" placeholder="Relevant experience, tools you'll bring…" />
      </Field>
      <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 sm:col-span-2">
        <span className="text-sm text-brand-900">Estimated total</span>
        <span className="font-display text-xl font-bold text-brand-900">{formatINR(total)}</span>
      </div>
      {state?.error ? <div className="sm:col-span-2"><Alert>{state.error}</Alert></div> : null}
      {state?.ok ? <div className="sm:col-span-2"><Alert tone="emerald">{state.ok}</Alert></div> : null}
      <SubmitButton size="lg" className="sm:col-span-2" pendingText="Sending…">{defaults.rate ? "Update proposal" : "Send proposal"}</SubmitButton>
    </form>
  );
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
