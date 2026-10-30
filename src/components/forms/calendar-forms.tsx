"use client";
import { useActionState } from "react";
import { addWeeklySlotAction, addBlockAction } from "@/app/actions/profile";
import { Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/form-button";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeeklySlotForm() {
  const [state, action] = useActionState(addWeeklySlotAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d, i) => (
          <label key={d} className="cursor-pointer rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-700 has-[:checked]:text-white">
            <input type="checkbox" name="days" value={i} defaultChecked={i >= 1 && i <= 6} className="sr-only" />{d}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <Field label="From" htmlFor="ws-start"><Input id="ws-start" name="start" type="time" defaultValue="09:00" /></Field>
        <Field label="To" htmlFor="ws-end"><Input id="ws-end" name="end" type="time" defaultValue="18:00" /></Field>
        <SubmitButton pendingText="…">Add</SubmitButton>
      </div>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : state?.ok ? <p className="text-sm text-emerald-700">{state.ok}</p> : null}
    </form>
  );
}

export function BlockForm({ today }: { today: string }) {
  const [state, action] = useActionState(addBlockAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Type" htmlFor="b-type">
        <Select id="b-type" name="type"><option value="BUSY">Busy (block requests)</option><option value="AVAILABLE_EXTRA">Temporary / emergency availability</option></Select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Date" htmlFor="b-date"><Input id="b-date" name="date" type="date" min={today} defaultValue={today} /></Field>
        <Field label="From" htmlFor="b-start"><Input id="b-start" name="start" type="time" defaultValue="10:00" /></Field>
        <Field label="To" htmlFor="b-end"><Input id="b-end" name="end" type="time" defaultValue="14:00" /></Field>
      </div>
      <Field label="Note (optional)" htmlFor="b-note"><Input id="b-note" name="note" placeholder="e.g. Exam, family function" /></Field>
      <SubmitButton variant="secondary" pendingText="Saving…">Add to calendar</SubmitButton>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : state?.ok ? <p className="text-sm text-emerald-700">{state.ok}</p> : null}
    </form>
  );
}
