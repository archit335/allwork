"use client";
import { useActionState, useState } from "react";
import { createProjectAction, applyProjectAction } from "@/app/actions/projects";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/form-button";
import { COLLAB_LABEL } from "@/lib/utils";
import { SKILL_CATALOG } from "@/lib/skills-catalog";

const HINTS: Record<string, string> = {
  PAID: "e.g. ₹15,000/month, or ₹500/hour, paid every 2 weeks.",
  UNPAID_VOLUNTARY: "e.g. No payment. Credit on the website and a recommendation letter.",
  REVENUE_SHARE: "e.g. 10% of net revenue for 2 years, shared monthly once revenue starts.",
  EQUITY: "e.g. 2% equity vesting over 4 years with a 1-year cliff. No salary.",
  OPEN_SOURCE: "e.g. MIT-licensed project. Contributors are credited in the README.",
  LEARNING: "e.g. No payment. Weekly mentorship from a senior engineer; real project for your portfolio.",
};

export function ProjectForm() {
  const [state, action] = useActionState(createProjectAction, undefined);
  const [type, setType] = useState("PAID");
  const fe = state?.fieldErrors ?? {};
  const paid = COLLAB_LABEL[type]?.paid;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Project name" htmlFor="name" error={fe.name} className="sm:col-span-2"><Input id="name" name="name" required /></Field>
      <Field label="Project description" htmlFor="description" error={fe.description} className="sm:col-span-2"><Textarea id="description" name="description" required className="min-h-32" placeholder="What are you building, for whom, and why?" /></Field>
      <Field label="Category" htmlFor="category" error={fe.category}>
        <Input id="category" name="category" list="proj-cats" required placeholder="e.g. AI startup, E-commerce, College project" />
        <datalist id="proj-cats">{["AI / ML", "E-commerce", "Mobile app", "SaaS", "College / final-year project", "Open source", "Content / Media", "Social impact", "Hardware"].map((c) => <option key={c} value={c} />)}</datalist>
      </Field>
      <Field label="Stage" htmlFor="stage"><Select id="stage" name="stage" defaultValue="Idea">{["Idea", "Prototype", "MVP", "Launched", "Growing"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
      <Field label="Required skills" htmlFor="skills" error={fe.skills} hint="Comma separated, e.g. Frontend Developer, Backend Developer, UI/UX Designer" className="sm:col-span-2">
        <Input id="skills" name="skills" list="proj-skills" required />
        <datalist id="proj-skills">{SKILL_CATALOG.map((s) => <option key={s.name} value={s.name} />)}</datalist>
      </Field>
      <Field label="Contributors needed" htmlFor="contributorsNeeded" error={fe.contributorsNeeded}><Input id="contributorsNeeded" name="contributorsNeeded" type="number" min={1} max={100} defaultValue={3} /></Field>
      <Field label="Project duration" htmlFor="duration"><Input id="duration" name="duration" placeholder="e.g. 3 months, ongoing" /></Field>
      <Field label="Working hours" htmlFor="workingHours"><Input id="workingHours" name="workingHours" placeholder="e.g. 10 hrs/week, evenings" /></Field>
      <Field label="City (if on-site)" htmlFor="city" error={fe.city}><Input id="city" name="city" /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isRemote" defaultChecked className="size-4 accent-brand-700" />Remote collaboration</label>
      <Field label="Expected responsibilities" htmlFor="responsibilities" className="sm:col-span-2"><Textarea id="responsibilities" name="responsibilities" placeholder="What will each contributor own?" /></Field>

      <fieldset className="space-y-3 rounded-2xl border-2 border-brand-200 bg-brand-50/40 p-4 sm:col-span-2">
        <legend className="px-1 font-display font-bold">Collaboration & compensation</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(COLLAB_LABEL).map(([k, v]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-surface px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:ring-2 has-[:checked]:ring-brand-100">
              <input type="radio" name="collabType" value={k} checked={type === k} onChange={() => setType(k)} className="accent-brand-700" />{v.label}
            </label>
          ))}
        </div>
        <Field label="Compensation terms (shown to everyone before they apply)" htmlFor="compensationTerms" error={fe.compensationTerms}>
          <Textarea id="compensationTerms" name="compensationTerms" required placeholder={HINTS[type]} className="min-h-20" />
        </Field>
        {!paid ? <Alert tone="amber">This is <strong>not paid employment</strong>. It will be labelled “{COLLAB_LABEL[type]?.label}” everywhere, and applicants must acknowledge the terms before applying.</Alert> : null}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="ack" className="mt-0.5 size-4 accent-brand-700" />I confirm these compensation terms are accurate and complete.</label>
        {fe.ack ? <p className="text-xs text-red-600">{fe.ack}</p> : null}
      </fieldset>
      {state?.error ? <div className="sm:col-span-2"><Alert>{state.error}</Alert></div> : null}
      <SubmitButton size="lg" className="sm:col-span-2" pendingText="Publishing…">Publish project</SubmitButton>
    </form>
  );
}

export function ApplyForm({ projectId, collabLabel, terms, skills }: { projectId: string; collabLabel: string; terms: string; skills: string[] }) {
  const [state, action] = useActionState(applyProjectAction.bind(null, projectId), undefined);
  if (state?.ok) return <Alert tone="emerald">{state.ok}</Alert>;
  return (
    <form action={action} className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-semibold">{collabLabel}</p>
        <p className="mt-0.5">{terms}</p>
      </div>
      <Field label="Role you're applying for" htmlFor="role">
        <Select id="role" name="role">{skills.map((s) => <option key={s}>{s}</option>)}<option value="">Other / general</option></Select>
      </Field>
      <Field label="Why you?" htmlFor="message"><Textarea id="message" name="message" required placeholder="Relevant skills, past projects, how much time you can give…" /></Field>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="ack" className="mt-0.5 size-4 accent-brand-700" />I&apos;ve read and understand the compensation terms above.</label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton className="w-full" pendingText="Sending…">Apply to contribute</SubmitButton>
    </form>
  );
}
