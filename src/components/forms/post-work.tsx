"use client";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Mic, MicOff, Sparkles, Wand2, Pencil, Info } from "lucide-react";
import { analyzeWorkAction, createJobAction } from "@/app/actions/jobs";
import type { ExtractionResult } from "@/lib/ai/schema";
import { Alert, Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/form-button";
import { CITY_NAMES } from "@/lib/geo";
import { WORK_TYPE_LABEL } from "@/lib/utils";

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function useSpeech(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const rec = useRef<SpeechRec | null>(null);
  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run on the client
    setSupported(true);
    const r = new Ctor();
    r.lang = "hi-IN"; // understands Hindi + Indian English
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0]!.transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
  }, [onText]);
  return {
    supported,
    listening,
    toggle() {
      if (!rec.current) return;
      if (listening) rec.current.stop();
      else { rec.current.start(); setListening(true); }
    },
  };
}

const EXAMPLES = [
  "I need an electrician to repair my fan in Noida today",
  "Kal Gurgaon factory mein 10 log chahiye packaging ke liye, 8 ghante, 800 rs per day",
  "I need a website developer for my startup, remote, budget 40000",
  "Need a cook for a family event in Jaipur on Sunday evening for 5 hours",
  "20 labourers for construction in Pune from Monday, 2 weeks",
];

export function PostWork({ initialQuery, loggedIn, aiLive }: { initialQuery: string; loggedIn: boolean; aiLive: boolean }) {
  const [text, setText] = useState(initialQuery);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [formState, formAction] = useActionState(createJobAction, undefined);
  const autoRan = useRef(false);
  const onSpeech = useCallback((t: string) => setText((p) => (p ? `${p} ${t}` : t)), []);
  const speech = useSpeech(onSpeech);

  const analyze = (q = text) =>
    start(async () => {
      setAnalyzeError(null);
      const r = await analyzeWorkAction(q);
      if (r.error) setAnalyzeError(r.error);
      else if (r.result) setResult(r.result);
    });

  useEffect(() => {
    if (initialQuery && !autoRan.current) {
      autoRan.current = true;
      analyze(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const j = result?.job;
  const fe = formState?.fieldErrors ?? {};

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      {/* Step 1: natural language */}
      <div className="space-y-4">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="size-5 text-brand-700" /> Describe the work</p>
            {aiLive ? <Badge tone="emerald">AI live</Badge> : <Badge tone="amber">Demo AI · rule-based</Badge>}
          </div>
          <p className="mt-1 text-sm text-stone-600">Write like you&apos;d tell a friend — English, Hindi or Hinglish.</p>
          <label htmlFor="work-text" className="sr-only">Work description</label>
          <Textarea
            id="work-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="mt-4 text-base"
            placeholder="e.g. I need 5 workers tomorrow for packaging in Gurgaon, 8 hours"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => analyze()} disabled={pending || text.trim().length < 5} size="lg">
              <Wand2 className="size-4" /> {pending ? "Understanding…" : "Understand my request"}
            </Button>
            {speech.supported ? (
              <Button variant="secondary" size="lg" onClick={speech.toggle} aria-pressed={speech.listening}>
                {speech.listening ? <><MicOff className="size-4 text-red-600" /> Stop</> : <><Mic className="size-4" /> Speak</>}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setResult({ source: "demo-rules", job: blankJob() })}>
              <Pencil className="size-4" /> Fill manually
            </Button>
          </div>
          {analyzeError ? <div className="mt-3"><Alert>{analyzeError}</Alert></div> : null}
          {!aiLive ? (
            <p className="mt-3 flex gap-1.5 text-xs text-stone-500"><Info className="mt-0.5 size-3.5 shrink-0" />No LLM key configured — an offline rule-based parser is used. Set ANTHROPIC_API_KEY to enable Claude.</p>
          ) : null}
        </Card>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Try an example</p>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => { setText(e); analyze(e); }} className="rounded-xl border border-stone-200 bg-surface px-3 py-2 text-left text-sm text-stone-700 hover:border-brand-400">
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2: structured, editable */}
      <div>
        {!j ? (
          <Card className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
            <Sparkles className="size-8 text-brand-300" />
            <p className="mt-3 font-display text-lg font-bold">Structured job details appear here</p>
            <p className="mt-1 max-w-sm text-sm text-stone-500">The assistant extracts skills, people needed, location, date, duration, budget and urgency. You can edit everything before publishing.</p>
          </Card>
        ) : (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg font-bold">Review & publish</p>
              <div className="flex gap-1.5">
                <Badge tone={result.source === "claude" ? "emerald" : "amber"}>{result.source === "claude" ? "Parsed by Claude" : "Parsed by demo rules"}</Badge>
                <Badge>{j.detectedLanguage}</Badge>
              </div>
            </div>
            {j.followUpQuestions.length ? (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                <p className="font-semibold">A few details would help:</p>
                <ul className="mt-1 list-disc pl-5">{j.followUpQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
                <p className="mt-1 text-xs text-sky-800">Add them to your description and re-run, or fill the fields below.</p>
              </div>
            ) : null}

            <form key={JSON.stringify(j)} action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
              <input type="hidden" name="rawRequest" value={text} />
              <input type="hidden" name="aiSource" value={result.source} />
              <Field label="Title" htmlFor="title" error={fe.title} className="sm:col-span-2">
                <Input id="title" name="title" defaultValue={j.title} required />
              </Field>
              <Field label="Work description" htmlFor="description" error={fe.description} className="sm:col-span-2">
                <Textarea id="description" name="description" defaultValue={text || j.summary} required />
              </Field>
              <Field label="Required skills" htmlFor="skills" error={fe.skills} hint="Comma separated. New skills are created automatically.">
                <Input id="skills" name="skills" defaultValue={j.skills.join(", ")} required />
              </Field>
              <Field label="Category" htmlFor="category" error={fe.category}>
                <Input id="category" name="category" defaultValue={j.category} required />
              </Field>
              <Field label="Number of workers" htmlFor="workersNeeded" error={fe.workersNeeded}>
                <Input id="workersNeeded" name="workersNeeded" type="number" min={1} max={1000} defaultValue={j.workersNeeded} required />
              </Field>
              <Field label="Work type" htmlFor="workType">
                <Select id="workType" name="workType" defaultValue={j.workType}>
                  {Object.entries(WORK_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="City" htmlFor="city" error={fe.city}>
                <Input id="city" name="city" list="post-cities" defaultValue={j.city ?? ""} placeholder="e.g. Gurgaon" />
                <datalist id="post-cities">{CITY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label="Area / address" htmlFor="address">
                <Input id="address" name="address" defaultValue={j.address ?? ""} placeholder="Sector, locality, landmark" />
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-800 sm:col-span-2">
                <input type="checkbox" name="isRemote" defaultChecked={j.isRemote} className="size-4 accent-brand-700" /> This work can be done remotely
              </label>
              <Field label="Start date" htmlFor="startDate" error={fe.startDate}>
                <Input id="startDate" name="startDate" type="date" defaultValue={j.date ?? ""} />
              </Field>
              <Field label="Start time" htmlFor="startTime">
                <Input id="startTime" name="startTime" type="time" defaultValue={j.startTime ?? ""} />
              </Field>
              <Field label="Hours of work" htmlFor="durationHours" hint="Per day / per engagement">
                <Input id="durationHours" name="durationHours" type="number" step="0.5" min={0.5} defaultValue={j.durationHours ?? ""} />
              </Field>
              <Field label="Expected duration" htmlFor="durationText">
                <Input id="durationText" name="durationText" defaultValue={j.durationText ?? ""} placeholder="e.g. 3 days, ongoing" />
              </Field>
              <Field label="Budget min (₹) — optional" htmlFor="budgetMin">
                <Input id="budgetMin" name="budgetMin" type="number" min={0} defaultValue={j.budgetMin ?? ""} />
              </Field>
              <Field label="Budget max (₹) — optional" htmlFor="budgetMax" error={fe.budgetMax}>
                <Input id="budgetMax" name="budgetMax" type="number" min={0} defaultValue={j.budgetMax ?? ""} />
              </Field>
              <Field label="Budget is per" htmlFor="budgetUnit">
                <Select id="budgetUnit" name="budgetUnit" defaultValue={j.budgetUnit ?? ""}>
                  <option value="">—</option><option value="HOUR">Hour</option><option value="DAY">Day</option><option value="TOTAL">Whole job</option><option value="MONTH">Month</option>
                </Select>
              </Field>
              <Field label="Urgency" htmlFor="urgency">
                <Select id="urgency" name="urgency" defaultValue={j.urgency}>
                  <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                </Select>
              </Field>
              <Field label="Experience required" htmlFor="experienceRequired" className="sm:col-span-2">
                <Input id="experienceRequired" name="experienceRequired" defaultValue={j.experienceRequired} />
              </Field>
              <Field label="Special instructions" htmlFor="specialInstructions" className="sm:col-span-2">
                <Textarea id="specialInstructions" name="specialInstructions" defaultValue={j.specialInstructions ?? ""} className="min-h-16" />
              </Field>
              <Field label="Attachment links — optional" htmlFor="attachments" hint="Paste links to photos/documents (Drive, Dropbox…), separated by spaces." className="sm:col-span-2">
                <Input id="attachments" name="attachments" placeholder="https://…" />
              </Field>
              {formState?.error ? <div className="sm:col-span-2"><Alert>{formState.error}{!loggedIn ? <> <Link className="font-semibold underline" href="/login?next=/post">Log in</Link></> : null}</Alert></div> : null}
              <div className="sm:col-span-2">
                {loggedIn ? (
                  <SubmitButton size="lg" variant="accent" className="w-full" pendingText="Publishing & matching workers…">Publish & notify matching workers</SubmitButton>
                ) : (
                  <Link href={`/signup?next=${encodeURIComponent(`/post?q=${text}`)}`} className="flex h-12 w-full items-center justify-center rounded-xl bg-accent-500 font-semibold text-white hover:bg-accent-600">
                    Create free account to publish
                  </Link>
                )}
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

function blankJob(): ExtractionResult["job"] {
  return {
    title: "", summary: "", category: "General", skills: [], workersNeeded: 1, city: null, address: null, isRemote: false,
    date: null, startTime: null, durationHours: null, durationText: null, budgetMin: null, budgetMax: null, budgetUnit: null,
    workType: "ONE_TIME", experienceRequired: "Not mandatory", urgency: "NORMAL", specialInstructions: null,
    detectedLanguage: "—", followUpQuestions: [], isLegitimate: true,
  };
}
