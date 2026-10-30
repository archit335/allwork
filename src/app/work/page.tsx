import Link from "next/link";
import { MapPin, CalendarDays, Users, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, Input, LinkButton, PageHeader, Select, Button } from "@/components/ui";
import { CITY_NAMES } from "@/lib/geo";
import { SKILL_CATEGORIES } from "@/lib/skills-catalog";
import { WORK_TYPE_LABEL, formatDate, formatINR, timeAgo } from "@/lib/utils";

export const metadata = { title: "Find Work" };

export default async function WorkPage({ searchParams }: PageProps<"/work">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const remote = sp.remote === "1";

  const where: Prisma.JobWhereInput = {
    status: "OPEN",
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { skills: { some: { skill: { name: { contains: q, mode: "insensitive" } } } } }] } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    ...(category ? { category } : {}),
    ...(type && type in WORK_TYPE_LABEL ? { workType: type as Prisma.EnumWorkTypeFilter["equals"] } : {}),
    ...(remote ? { isRemote: true } : {}),
  };
  const jobs = await db.job.findMany({ where, include: { skills: { include: { skill: true } } }, orderBy: [{ urgency: "desc" }, { createdAt: "desc" }], take: 60 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Find Work" subtitle="Open work from people and businesses near you. Matching requests also arrive automatically in your dashboard." action={<LinkButton href="/dashboard/requests" variant="secondary">My work requests</LinkButton>} />
      <form className="mb-6 grid gap-2 rounded-2xl border border-stone-200 bg-surface p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
        <Input name="q" defaultValue={q} placeholder="Skill or keyword — e.g. electrician, React, packing" aria-label="Search" />
        <Input name="city" defaultValue={city} list="w-cities" placeholder="City" aria-label="City" />
        <datalist id="w-cities">{CITY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
        <Select name="category" defaultValue={category} aria-label="Category"><option value="">All categories</option>{SKILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
        <Select name="type" defaultValue={type} aria-label="Work type"><option value="">Any type</option>{Object.entries(WORK_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label className="flex items-center gap-2 px-2 text-sm"><input type="checkbox" name="remote" value="1" defaultChecked={remote} className="accent-brand-700" />Remote</label>
        <Button type="submit"><Search className="size-4" />Search</Button>
      </form>
      {jobs.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="group">
              <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5"><Badge tone="brand">{j.category}</Badge>{j.urgency === "URGENT" ? <Badge tone="orange">urgent</Badge> : null}</div>
                  <span className="text-xs text-stone-400">{timeAgo(j.createdAt)}</span>
                </div>
                <p className="mt-3 font-display text-lg font-bold group-hover:text-brand-800">{j.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-stone-600">{j.description}</p>
                <div className="mt-auto space-y-1 pt-4 text-sm text-stone-600">
                  <p className="flex items-center gap-1.5"><MapPin className="size-4 text-stone-400" />{j.isRemote ? "Remote" : j.city}</p>
                  <p className="flex items-center gap-1.5"><CalendarDays className="size-4 text-stone-400" />{formatDate(j.startDate)} · {WORK_TYPE_LABEL[j.workType]}</p>
                  <p className="flex items-center gap-1.5"><Users className="size-4 text-stone-400" />{j.workersNeeded} needed{j.budgetMax ? ` · up to ${formatINR(j.budgetMax)}` : ""}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">{j.skills.slice(0, 3).map((s) => <Badge key={s.skillId}>{s.skill.name}</Badge>)}</div>
              </Card>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="No open work matches these filters" body="Try a broader search, or set up your profile so new work comes to you." action={<LinkButton href="/dashboard/profile">Update my skills</LinkButton>} />}
    </div>
  );
}
