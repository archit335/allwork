"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, Megaphone, Users, Search, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

const PROMPTS = [
  "I need an electrician to repair my fan",
  "Kal Gurgaon mein 10 log chahiye packaging ke liye, 8 ghante",
  "Website developer for my startup",
  "Cook for a family event on Sunday",
  "20 labourers for construction in Noida",
];

const PILLARS = [
  { href: "/work", label: "Find Work", icon: Briefcase, desc: "Earn with your skills", cls: "bg-zap-400 text-ink shadow-zap-400/30", sub: "text-ink/70" },
  { href: "/post", label: "Post Any Work", icon: Megaphone, desc: "Describe it in plain words", cls: "bg-accent-500 text-white shadow-accent-500/40", sub: "text-white/80" },
  { href: "/projects", label: "Collaborate", icon: Users, desc: "Find people to build with", cls: "bg-brand-500 text-white shadow-brand-500/40", sub: "text-white/80" },
  { href: "/talent", label: "Hire Talent", icon: Search, desc: "Freelance to full-time", cls: "bg-white/10 text-white ring-1 ring-white/25 backdrop-blur shadow-black/30", sub: "text-white/60" },
];

const FLOATERS = [
  { t: "⚡ 10 packers · Gurgaon", c: "bg-zap-400 text-ink", pos: "left-[4%] top-[22%]", r: -6 },
  { t: "🎨 Logo designer · Remote", c: "bg-accent-500 text-white", pos: "right-[5%] top-[18%]", r: 5 },
  { t: "🔧 Plumber · 20 min away", c: "bg-surface text-ink", pos: "left-[3%] top-[50%]", r: 4 },
  { t: "🚀 Startup needs devs", c: "bg-brand-400 text-white", pos: "right-[3%] top-[48%]", r: -4 },
];

export function Hero() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % PROMPTS.length), 3200);
    return () => clearInterval(t);
  }, []);

  const fade = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {/* glowing blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -left-32 -top-32 size-[520px] rounded-full bg-brand-600/60 blur-[110px]" />
        <div className="animate-blob absolute -right-24 top-10 size-[460px] rounded-full bg-accent-500/45 blur-[110px] [animation-delay:-5s]" />
        <div className="animate-blob absolute -bottom-40 left-1/3 size-[480px] rounded-full bg-zap-400/25 blur-[120px] [animation-delay:-9s]" />
        <div className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      </div>

      {/* floating job chips (desktop) */}
      {FLOATERS.map((f, n) => (
        <motion.div
          key={f.t}
          aria-hidden
          className={`absolute hidden rounded-2xl px-4 py-2.5 text-sm font-bold shadow-2xl xl:block ${f.c} ${f.pos}`}
          style={{ rotate: f.r }}
          animate={reduce ? undefined : { y: [0, -14, 0] }}
          transition={{ duration: 5 + n, repeat: Infinity, ease: "easeInOut" }}
        >
          {f.t}
        </motion.div>
      ))}

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
        <motion.div {...fade(0)} className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zap-300 backdrop-blur">
          <Sparkles className="size-3.5" /> Any Work · Any Skill · Any Person · One Platform
        </motion.div>
        <motion.h1 {...fade(0.05)} className="mx-auto mt-7 max-w-5xl text-center font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
          Your Skills Deserve <span className="text-gradient">Better Opportunities</span>
          <span className="text-zap-400">.</span>
        </motion.h1>
        <motion.p {...fade(0.12)} className="mx-auto mt-7 max-w-2xl text-center text-lg text-white/70 sm:text-xl">
          Find work, hire talent, build projects, and collaborate with people. One AI-powered platform for every kind of work.
        </motion.p>

        <motion.form {...fade(0.2)} action="/post" className="mx-auto mt-10 max-w-2xl">
          <label htmlFor="hero-q" className="sr-only">What do you need done today?</label>
          <div className="rounded-[22px] bg-gradient-to-r from-zap-400 via-accent-500 to-brand-500 p-[2px] shadow-[0_0_60px_-10px] shadow-accent-500/60">
            <div className="flex items-center gap-2 rounded-[20px] bg-surface p-2">
              <Sparkles className="ml-2 size-5 shrink-0 text-accent-500" aria-hidden />
              <input id="hero-q" name="q" placeholder="What do you need done today?" className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-stone-400 focus:outline-none" />
              <button className="inline-flex h-12 items-center gap-1.5 rounded-2xl bg-zap-400 px-5 text-sm font-extrabold text-ink transition hover:bg-zap-300">
                Ask AI <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-white/50" aria-live="polite">
            Try: <Link href={`/post?q=${encodeURIComponent(PROMPTS[i]!)}`} className="font-semibold text-white/85 underline decoration-accent-400 decoration-2 underline-offset-4 hover:text-zap-300">“{PROMPTS[i]}”</Link>
          </p>
        </motion.form>

        <motion.div {...fade(0.28)} className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {PILLARS.map((p, n) => (
            <Link
              key={p.href}
              href={p.href}
              className={`group relative overflow-hidden rounded-3xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[-1deg] sm:p-6 ${p.cls}`}
            >
              <span className="absolute -right-3 -top-4 font-display text-7xl font-extrabold opacity-10">0{n + 1}</span>
              <p.icon className="size-7" />
              <p className="mt-6 font-display text-lg font-extrabold uppercase leading-tight tracking-wide sm:text-xl">{p.label}</p>
              <p className={`mt-1 text-sm ${p.sub}`}>{p.desc}</p>
              <ArrowRight className="mt-3 size-5 transition group-hover:translate-x-1.5" />
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const MARQUEE = [
  "Electrician", "Web Developer", "Packaging Worker", "Cook", "Graphic Designer", "Plumber", "Video Editor", "Driver",
  "Android Developer", "Carpenter", "Data Entry", "Welder", "Photographer", "AC Technician", "UI/UX Designer", "Mason",
  "Content Writer", "Machine Operator", "Tutor", "Social Media Manager",
];

export function SkillMarquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="relative -mt-px overflow-hidden border-y-2 border-brand-500 bg-zap-400 py-4" aria-label="Popular skills">
      <div className="animate-marquee flex w-max gap-8 motion-reduce:animate-none">
        {items.map((s, n) => (
          <Link key={n} href={`/talent?skill=${encodeURIComponent(s)}`} className="flex items-center gap-8 whitespace-nowrap font-display text-xl font-extrabold uppercase tracking-tight text-ink hover:text-brand-700" tabIndex={n >= MARQUEE.length ? -1 : 0}>
            {s} <span className="text-accent-500">✦</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
