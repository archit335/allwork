import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Bolt, Brain, CalendarCheck, CheckCircle2, Factory, Hammer, HandCoins, Laptop,
  MapPin, Megaphone, MessageSquareText, Palette, Rocket, ShieldCheck, Sparkles, Users, Wrench,
} from "lucide-react";
import { db } from "@/lib/db";
import { Hero, SkillMarquee } from "@/components/home/hero";
import { Reveal } from "@/components/home/reveal";
import { Badge, Card, LinkButton } from "@/components/ui";
import { POPULAR_SKILLS } from "@/lib/skills-catalog";
import { COLLAB_LABEL, formatINR, timeAgo } from "@/lib/utils";

function SectionHead({ eyebrow, title, body, center }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="inline-block rounded-full bg-accent-500/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-accent-600">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {body ? <p className="mt-4 text-lg text-stone-600">{body}</p> : null}
    </div>
  );
}

const STEP_COLORS = [
  "bg-brand-500 text-white",
  "bg-accent-500 text-white",
  "bg-zap-400 text-ink",
  "bg-ink text-zap-300",
];

const STEPS = [
  { icon: MessageSquareText, title: "Describe the work", body: "Type or speak naturally — English, Hindi or Hinglish. No forms full of categories." },
  { icon: Brain, title: "AI understands it", body: "Skills, people needed, location, date, duration and urgency are extracted automatically." },
  { icon: Bolt, title: "Right people get notified", body: "Matching workers nearby get a request instantly. First to accept reserves a spot." },
  { icon: CalendarCheck, title: "Compare & book", body: "Workers set their own price and time. You compare, pick, and book in one tap." },
];

const FAQ = [
  ["Do I need a degree to join?", "No. Anyone can register. Show what you can do through experience, portfolio, certifications or simply completed jobs and ratings."],
  ["Can one person both work and hire?", "Yes. Every account can find work, post work, hire talent and collaborate on projects — switch freely from your dashboard."],
  ["How does “first responder” work?", "When a job is posted, matching workers get a request. The first eligible workers to accept each reserve one position for a limited time and then submit their price and availability. Reserving gives priority — the client still makes the final choice."],
  ["Who decides the price?", "Workers do. Clients can share an optional budget, but each worker proposes their own rate, timing and extra charges."],
  ["Is unpaid collaboration allowed?", "Yes, but it is always clearly labelled. Every project shows whether it is paid, unpaid, revenue-share, equity, open-source or learning-based before anyone applies. Unpaid work is never shown as employment."],
  ["Are payments live?", "Payments currently run in a clearly labelled test mode while a payment gateway is being integrated. No real money moves yet."],
];

export default async function Home() {
  const [jobs, projects, counts] = await Promise.all([
    db.job.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 6, include: { skills: { include: { skill: true } } } }),
    db.project.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 3, include: { skills: { include: { skill: true } } } }),
    Promise.all([db.user.count(), db.job.count(), db.project.count()]),
  ]);

  return (
    <>
      <Hero />
      <SkillMarquee />

      {/* How it works */}
      <section className="bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead eyebrow="How it works" title="From “I need help” to “It's done” in minutes" center />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className={`relative h-full overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1 hover:rotate-[-0.5deg] ${STEP_COLORS[i]}`}>
                  <span className="absolute -right-2 -top-6 font-display text-8xl font-extrabold opacity-15">0{i + 1}</span>
                  <s.icon className="size-8" />
                  <h3 className="mt-6 font-display text-xl font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed opacity-80">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Find Work */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <SectionHead eyebrow="Pillar 1 · Find Work" title="Earn with the skills you actually have" body="Developer, electrician, packer, designer, cook or accountant — list as many skills as you have. Set your own price, your own hours and your own working radius." />
            <ul className="mt-6 space-y-3">
              {["Multiple skills on one profile — add any custom skill", "Instant work requests for jobs near you", "You set your price and availability", "Get rated on real work, not on degrees"].map((t) => (
                <li key={t} className="flex gap-3 text-stone-700"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" />{t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/signup" size="lg">Create worker profile <ArrowRight className="size-4" /></LinkButton>
              <LinkButton href="/work" variant="secondary" size="lg">Browse open work</LinkButton>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="mx-auto max-w-md overflow-hidden p-0 shadow-2xl shadow-brand-900/10">
              <div className="bg-brand-700 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white">⚡ New work request!</div>
              <div className="space-y-3 p-5">
                <p className="font-display text-lg font-bold text-ink">10 × Packaging Worker in Gurgaon</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-stone-600">
                  <span className="flex items-center gap-1.5"><MapPin className="size-4" />Sector 37, Gurgaon</span>
                  <span className="flex items-center gap-1.5"><CalendarCheck className="size-4" />Tomorrow · 9 AM</span>
                  <span className="flex items-center gap-1.5"><Bolt className="size-4" />8 hours</span>
                  <span className="flex items-center gap-1.5"><HandCoins className="size-4" />₹700–900/day</span>
                </div>
                <div className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">3 of 10 positions reserved · be quick</div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <span className="rounded-xl bg-brand-700 py-2.5 text-center text-sm font-bold text-white">ACCEPT REQUEST</span>
                  <span className="rounded-xl border border-stone-300 py-2.5 text-center text-sm font-bold text-stone-700">REJECT</span>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Post Any Work */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-accent-600 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <div className="space-y-3">
                {[
                  "I need an electrician to repair my fan.",
                  "I need 5 workers tomorrow for packaging.",
                  "I need a cook for a family event.",
                  "I need someone to manage my shop.",
                  "I need a developer to build an Android application.",
                ].map((q, i) => (
                  <div key={q} className={`rounded-2xl px-5 py-4 font-semibold shadow-lg ${i % 2 ? "ml-8 rounded-br-sm bg-zap-400 text-ink" : "mr-8 rounded-bl-sm bg-white/15 text-white backdrop-blur"}`}>“{q}”</div>
                ))}
              </div>
            </Reveal>
            <Reveal className="order-1 lg:order-2" delay={0.1}>
              <p className="text-sm font-extrabold uppercase tracking-widest text-zap-300">Pillar 2 · Post Any Work</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Any legitimate task. Your own words.</h2>
              <p className="mt-4 text-lg text-white/80">One worker for an hour or a hundred for a month. No forced categories — if it&apos;s real work, AllWork understands it. Budget is optional.</p>
              <LinkButton href="/post" size="lg" variant="zap" className="mt-8 h-14 px-8 text-lg">
                <Megaphone className="size-5" /> POST ANY WORK
              </LinkButton>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Collaborate */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <SectionHead eyebrow="Pillar 3 · Collaborate" title="Find people to build with" body="Students, solo founders, creators and open-source maintainers: publish your project and invite contributors. Compensation is always shown clearly before anyone applies." />
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(COLLAB_LABEL).map(([k, v], i) => (
              <Reveal key={k} delay={i * 0.05}>
                <div className={`flex items-center justify-between rounded-2xl px-5 py-4 font-bold transition hover:-translate-y-0.5 ${["bg-brand-500 text-white", "bg-zap-400 text-ink", "bg-accent-500 text-white", "bg-ink text-zap-300", "bg-surface text-ink border-2 border-brand-500", "bg-brand-100 text-brand-900"][i]}`}>
                  <span>{v.label}</span>
                  <span className="rounded-full bg-black/10 px-2.5 py-0.5 text-xs">{v.paid ? "💰 Paid" : "Not salaried"}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/projects/new" size="lg"><Rocket className="size-4" /> Publish a project</LinkButton>
            <LinkButton href="/projects" variant="secondary" size="lg">Discover projects</LinkButton>
          </div>
        </div>
      </section>

      {/* Hire */}
      <section className="bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal><SectionHead eyebrow="Pillar 4 · Hire Talent" title="From one freelancer to a hundred factory workers" body="Businesses, startups, factories, shops and households can search, filter, shortlist and hire — temporary, part-time, full-time or project-based." /></Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Laptop, t: "Startups", d: "Developers, designers, interns and first employees." },
              { icon: Factory, t: "Factories", d: "Packers, operators and production staff — at scale." },
              { icon: Hammer, t: "Shops & sites", d: "Salesmen, helpers, masons and daily labour." },
              { icon: Wrench, t: "Households", d: "Electricians, plumbers, cooks and cleaners nearby." },
            ].map((x, i) => (
              <Reveal key={x.t} delay={i * 0.06}>
                <div className="h-full rounded-3xl border-2 border-brand-500 p-6 shadow-[6px_6px_0_0] shadow-brand-500 transition hover:-translate-y-1 hover:shadow-[8px_10px_0_0]">
                  <span className={`grid size-12 place-items-center rounded-2xl ${STEP_COLORS[i]}`}><x.icon className="size-6" /></span>
                  <p className="mt-4 font-display text-lg font-bold">{x.t}</p>
                  <p className="mt-1 text-sm text-stone-600">{x.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <LinkButton href="/talent" size="lg" className="mt-10">Search talent <ArrowRight className="size-4" /></LinkButton>
        </div>
      </section>

      {/* AI assistant */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <SectionHead eyebrow="AI Work Assistant" title="It understands work the way people describe it" body="Messy, short, Hinglish — doesn't matter. The assistant extracts what's needed, asks follow-up questions only when something important is missing, and never rejects a legitimate request just because a category doesn't exist yet." />
            <LinkButton href="/post" variant="outline" size="lg" className="mt-8"><Sparkles className="size-4" /> Try the assistant</LinkButton>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="p-6">
              <p className="rounded-2xl rounded-bl-sm bg-ink px-4 py-3 text-sm font-medium text-zap-300">“Kal Gurgaon factory mein 10 log chahiye packaging ke liye, 8 ghante ka kaam hai”</p>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 text-sm">
                {[["Category", "Industrial / Packaging"], ["Workers", "10"], ["Location", "Gurgaon"], ["Date", "Tomorrow"], ["Duration", "8 hours"], ["Experience", "Not mandatory"], ["Work type", "Daily / Temporary"], ["Urgency", "High"]].map(([k, v]) => (
                  <div key={k} className="bg-surface px-4 py-3"><p className="text-xs text-stone-500">{k}</p><p className="font-semibold text-ink">{v}</p></div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Popular skills */}
      <section className="border-y border-stone-200 bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead eyebrow="Popular skills" title="What people are hiring for" />
          <div className="mt-8 flex flex-wrap gap-2">
            {POPULAR_SKILLS.map((s) => (
              <Link key={s} href={`/talent?skill=${encodeURIComponent(s)}`} className="rounded-full border-2 border-brand-500 bg-surface px-4 py-2 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-zap-400">{s}</Link>
            ))}
            <Link href="/talent" className="rounded-full px-4 py-2 text-sm font-semibold text-brand-700">+ any custom skill</Link>
          </div>
        </div>
      </section>

      {/* Featured opportunities */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead eyebrow="Featured opportunities" title="Open right now" />
            <LinkButton href="/work" variant="secondary">See all work</LinkButton>
          </div>
          {jobs.length + projects.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">No live opportunities yet — <Link href="/post" className="font-semibold text-brand-700">post the first one</Link>.</p>
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="group rounded-2xl border border-stone-200 bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between"><Badge tone="brand">{j.category}</Badge><span className="text-xs text-stone-400">{timeAgo(j.createdAt)}</span></div>
                  <p className="mt-3 font-display font-bold text-ink group-hover:text-brand-800">{j.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{j.description}</p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-stone-500"><MapPin className="size-3.5" />{j.isRemote ? "Remote" : (j.city ?? "Location TBD")} · {j.workersNeeded} needed{j.budgetMax ? ` · up to ${formatINR(j.budgetMax)}` : ""}</p>
                </Link>
              ))}
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="group rounded-2xl border border-violet-200 bg-violet-50/40 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between"><Badge tone="violet">Project · {COLLAB_LABEL[p.collabType]?.label}</Badge></div>
                  <p className="mt-3 font-display font-bold text-ink">{p.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{p.description}</p>
                  <p className="mt-3 text-xs text-stone-500">{p.contributorsNeeded} contributors · {p.skills.map((s) => s.skill.name).slice(0, 3).join(", ")}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why we started */}
      <section id="story" className="relative scroll-mt-20 overflow-hidden bg-ink py-20 text-white sm:py-28">
        <div aria-hidden className="animate-blob absolute -right-40 top-0 size-[500px] rounded-full bg-accent-500/30 blur-[120px]" />
        <div aria-hidden className="animate-blob absolute -left-40 bottom-0 size-[500px] rounded-full bg-brand-600/40 blur-[120px] [animation-delay:-6s]" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-sm font-extrabold uppercase tracking-widest text-zap-300">Why we started</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Our friends had skills. They didn&apos;t have opportunities.</h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-white/75">
            <p>B.Tech graduates, designers, engineers, MBAs — educated, talented, ambitious. Some were driving delivery bikes to manage daily expenses while searching for work in their actual field. Some were building projects alone because they couldn&apos;t find contributors.</p>
            <p>At the same time, startups couldn&apos;t afford full-time hires, factories needed 50 workers by tomorrow, and families couldn&apos;t find a reliable electrician.</p>
            <p className="font-semibold text-zap-300">There is a gap between people who need work done and people who are capable of doing it. We&apos;re here to close it.</p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Our mission</p>
          <p className="mt-6 bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600 bg-clip-text font-display text-4xl font-extrabold leading-tight tracking-tight text-transparent sm:text-7xl">“Your Skills Should Never Go Unused.”</p>
          <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
            {[
              { i: ShieldCheck, t: "Skills over degrees", d: "Proven work, ratings and reliability matter more than certificates." },
              { i: BadgeCheck, t: "Honest by design", d: "Paid vs unpaid is always clear. Workers set their own prices." },
              { i: Users, t: "For everyone", d: "Skilled and unskilled, one task or a whole workforce." },
            ].map((x) => (
              <div key={x.t} className="rounded-3xl border-2 border-brand-500 bg-surface p-6 shadow-[6px_6px_0_0] shadow-brand-500">
                <x.i className="size-7 text-accent-500" />
                <p className="mt-3 font-display font-bold">{x.t}</p>
                <p className="mt-1 text-sm text-stone-600">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-stone-500">{counts[0]} people · {counts[1]} jobs posted · {counts[2]} projects — and counting.</p>
        </div>
      </section>

      {/* Testimonials — illustrative until real reviews accumulate */}
      <section className="border-y border-stone-200 bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead eyebrow="Stories we're building for" title="Who AllWork is for" center />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { q: "I'm a B.Tech grad doing deliveries at night. I want my weekends to pay me for React work instead.", n: "A developer", r: "Delhi NCR", icon: Laptop },
              { q: "When an order comes in, I need 30 packers by morning. Calling contractors one by one doesn't scale.", n: "A factory owner", r: "Gurgaon", icon: Factory },
              { q: "I'm building my final-year AI project and need a designer and a backend dev who actually care.", n: "A student founder", r: "Pune", icon: Palette },
            ].map((t, i) => (
              <figure key={t.n} className={`rounded-3xl p-6 ${["bg-brand-500 text-white", "bg-zap-400 text-ink", "bg-accent-500 text-white"][i]}`}>
                <t.icon className="size-7" />
                <blockquote className="mt-4 text-lg font-semibold leading-snug">“{t.q}”</blockquote>
                <figcaption className="mt-4 text-sm font-bold">{t.n} <span className="font-normal opacity-75">· {t.r}</span></figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-stone-400">Illustrative personas based on the real problems that inspired AllWork — not customer reviews.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHead eyebrow="FAQ" title="Questions, answered" center />
          <div className="mt-10 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                  {q}<span className="text-xl text-brand-700 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-stone-600">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 text-center">
            <LinkButton href="/signup" size="lg">Join AllWork free <ArrowRight className="size-4" /></LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
