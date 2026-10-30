"use client";
import { useActionState, useState } from "react";
import { LocateFixed, X } from "lucide-react";
import { updateProfileAction, addSkillsAction, removeSkillAction, requestVerificationAction } from "@/app/actions/profile";
import { Alert, Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/form-button";
import { CITY_NAMES } from "@/lib/geo";
import { SKILL_CATALOG, SKILL_CATEGORIES } from "@/lib/skills-catalog";
import { WORK_TYPE_LABEL } from "@/lib/utils";

export type ProfileDefaults = {
  name: string; email: string; city: string; area: string; bio: string; avatarUrl: string; lat: number | null; lng: number | null;
  headline: string; experienceYears: number; education: string; languages: string; certifications: string; portfolioLinks: string;
  previousWork: string; preferredLocations: string; workRadiusKm: number; remoteOk: boolean; isAvailable: boolean; emergencyAvailable: boolean;
  hourlyRate: number | null; dailyRate: number | null; expectedComp: string; workTypes: string[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-3 font-display text-lg font-bold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ProfileForm({ d }: { d: ProfileDefaults }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: d.lat, lng: d.lng });
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const fe = state?.fieldErrors ?? {};

  const locate = () => {
    if (!navigator.geolocation) return setGeoMsg("Location isn't available in this browser.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoMsg("Precise location captured — save to apply."); },
      () => setGeoMsg("Couldn't get your location. City will be used instead."),
    );
  };

  return (
    <form action={action} className="space-y-10" noValidate>
      <input type="hidden" name="lat" value={coords.lat ?? ""} />
      <input type="hidden" name="lng" value={coords.lng ?? ""} />
      <Section title="Basics">
        <Field label="Full name" htmlFor="name" error={fe.name}><Input id="name" name="name" defaultValue={d.name} required /></Field>
        <Field label="Email (optional)" htmlFor="email" error={fe.email}><Input id="email" name="email" type="email" defaultValue={d.email} /></Field>
        <Field label="City" htmlFor="city" error={fe.city}>
          <Input id="city" name="city" list="p-cities" defaultValue={d.city} required />
          <datalist id="p-cities">{CITY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Area / locality" htmlFor="area"><Input id="area" name="area" defaultValue={d.area} /></Field>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={locate}><LocateFixed className="size-4" />Use my precise location</Button>
          <span className="text-xs text-stone-500">{geoMsg ?? (coords.lat ? "Location set for distance matching." : "Improves distance-based matching.")}</span>
        </div>
        <Field label="Profile picture link (optional)" htmlFor="avatarUrl" error={fe.avatarUrl} className="sm:col-span-2"><Input id="avatarUrl" name="avatarUrl" defaultValue={d.avatarUrl} placeholder="https://…" /></Field>
        <Field label="About you" htmlFor="bio" className="sm:col-span-2"><Textarea id="bio" name="bio" defaultValue={d.bio} /></Field>
      </Section>

      <Section title="Work profile">
        <Field label="Headline" htmlFor="headline" className="sm:col-span-2" hint="e.g. “Electrician · 6 yrs · house wiring & inverter”"><Input id="headline" name="headline" defaultValue={d.headline} /></Field>
        <Field label="Total experience (years)" htmlFor="experienceYears" error={fe.experienceYears}><Input id="experienceYears" name="experienceYears" type="number" min={0} max={60} defaultValue={d.experienceYears} /></Field>
        <Field label="Education (optional)" htmlFor="education" hint="Never required."><Input id="education" name="education" defaultValue={d.education} /></Field>
        <Field label="Languages" htmlFor="languages" hint="Comma separated"><Input id="languages" name="languages" defaultValue={d.languages} placeholder="Hindi, English" /></Field>
        <Field label="Certifications" htmlFor="certifications" hint="Comma separated"><Input id="certifications" name="certifications" defaultValue={d.certifications} /></Field>
        <Field label="Portfolio links" htmlFor="portfolioLinks" error={fe.portfolioLinks} hint="One per line" className="sm:col-span-2"><Textarea id="portfolioLinks" name="portfolioLinks" defaultValue={d.portfolioLinks} className="min-h-16" placeholder="https://github.com/you" /></Field>
        <Field label="Previous work" htmlFor="previousWork" className="sm:col-span-2"><Textarea id="previousWork" name="previousWork" defaultValue={d.previousWork} placeholder="Jobs you've done, places you've worked, things you've built…" /></Field>
      </Section>

      <Section title="Preferences & pricing">
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-stone-800">Work types I want</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(WORK_TYPE_LABEL).map(([k, v]) => (
              <label key={k} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-surface px-3 py-1.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="checkbox" name="workTypes" value={k} defaultChecked={d.workTypes.includes(k)} className="accent-brand-700" />{v}
              </label>
            ))}
          </div>
        </div>
        <Field label="Preferred locations" htmlFor="preferredLocations" hint="Cities you'll travel to, comma separated"><Input id="preferredLocations" name="preferredLocations" defaultValue={d.preferredLocations} /></Field>
        <Field label="Working radius (km)" htmlFor="workRadiusKm" error={fe.workRadiusKm}><Input id="workRadiusKm" name="workRadiusKm" type="number" min={1} max={500} defaultValue={d.workRadiusKm} /></Field>
        <Field label="Hourly rate (₹)" htmlFor="hourlyRate"><Input id="hourlyRate" name="hourlyRate" type="number" min={0} defaultValue={d.hourlyRate ?? ""} /></Field>
        <Field label="Daily rate (₹)" htmlFor="dailyRate"><Input id="dailyRate" name="dailyRate" type="number" min={0} defaultValue={d.dailyRate ?? ""} /></Field>
        <Field label="Expected compensation (for full-time)" htmlFor="expectedComp" className="sm:col-span-2"><Input id="expectedComp" name="expectedComp" defaultValue={d.expectedComp} placeholder="e.g. ₹25,000/month" /></Field>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAvailable" defaultChecked={d.isAvailable} className="size-4 accent-brand-700" />I&apos;m available for work (receive requests)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remoteOk" defaultChecked={d.remoteOk} className="size-4 accent-brand-700" />I can work remotely</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="emergencyAvailable" defaultChecked={d.emergencyAvailable} className="size-4 accent-brand-700" />Available for urgent / emergency work</label>
        </div>
      </Section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-surface/95 p-3 shadow-lg backdrop-blur">
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
        {state?.ok ? <span role="status" className="text-sm text-emerald-700">{state.ok}</span> : null}
        {state?.error ? <span role="alert" className="text-sm text-red-600">{state.error}</span> : null}
      </div>
    </form>
  );
}

export function SkillsManager({ skills }: { skills: { skillId: string; name: string; years: number; level: string; isCustom: boolean }[] }) {
  const [state, action] = useActionState(addSkillsAction, undefined);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {skills.length ? skills.map((s) => (
          <span key={s.skillId} className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-1.5 text-sm text-brand-900">
            {s.name}<span className="text-xs text-brand-700/70">· {s.years}y · {s.level.toLowerCase()}</span>
            {s.isCustom ? <Badge tone="violet" className="px-1.5 py-0">custom</Badge> : null}
            <button type="button" onClick={() => removeSkillAction(s.skillId)} className="grid size-5 place-items-center rounded-full hover:bg-brand-200" aria-label={`Remove ${s.name}`}><X className="size-3" /></button>
          </span>
        )) : <p className="text-sm text-stone-500">No skills yet — add everything you can do. You&apos;ll only get requests that match.</p>}
      </div>
      <form action={action} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Skill(s)" htmlFor="skills" hint="Pick or type your own; comma separated">
          <Input id="skills" name="skills" list="skill-list" placeholder="e.g. Electrician, Inverter repair" required />
          <datalist id="skill-list">{SKILL_CATALOG.map((s) => <option key={s.name} value={s.name}>{s.category}</option>)}</datalist>
        </Field>
        <Field label="Years" htmlFor="years"><Input id="years" name="years" type="number" min={0} max={60} defaultValue={1} /></Field>
        <Field label="Level" htmlFor="level">
          <Select id="level" name="level" defaultValue="INTERMEDIATE"><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="EXPERT">Expert</option></Select>
        </Field>
        <Field label="Category (custom)" htmlFor="category">
          <Select id="category" name="category" defaultValue="Other">{[...SKILL_CATEGORIES, "Other"].map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </form>
      {state?.error ? <Alert>{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="emerald">{state.ok}</Alert> : null}
    </div>
  );
}

export function VerificationForm() {
  const [state, action] = useActionState(requestVerificationAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
      <Field label="Type" htmlFor="vtype">
        <Select id="vtype" name="type"><option value="IDENTITY">Identity</option><option value="SKILL">Skill</option><option value="PORTFOLIO">Portfolio</option></Select>
      </Field>
      <Field label="Details" htmlFor="vdetails"><Input id="vdetails" name="details" placeholder="e.g. Aadhaar (last 4: 1234), ITI Electrician certificate, github link…" /></Field>
      <SubmitButton variant="secondary" pendingText="Sending…">Request</SubmitButton>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-700 sm:col-span-3">{state.ok}</p> : null}
    </form>
  );
}
