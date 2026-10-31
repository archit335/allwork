import Link from "next/link";
import { Users, MapPin, Search } from "lucide-react";
import type { CollabType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { Badge, Button, Card, EmptyState, Input, LinkButton, PageHeader, Select, type Tone } from "@/components/ui";
import { COLLAB_LABEL, timeAgo } from "@/lib/utils";

export const metadata = { title: "Collaborate" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const type = typeof sp.type === "string" && sp.type in COLLAB_LABEL ? (sp.type as CollabType) : undefined;
  const where: Prisma.ProjectWhereInput = {
    status: "OPEN",
    ...(type ? { collabType: type } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }, { skills: { some: { skill: { name: { contains: q, mode: "insensitive" } } } } }] } : {}),
  };
  const projects = await db.project.findMany({
    where, orderBy: { createdAt: "desc" }, take: 60,
    include: { owner: { select: { name: true } }, skills: { include: { skill: true } }, _count: { select: { applications: { where: { status: "ACCEPTED" } } } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Find people to build with" subtitle="Startups, student projects, open source and creator collaborations. Compensation is always shown up front." action={<LinkButton href="/projects/new">Publish a project</LinkButton>} />
      <form className="mb-6 grid gap-2 rounded-2xl border border-stone-200 bg-surface p-3 sm:grid-cols-[2fr_1fr_auto]">
        <Input name="q" defaultValue={q} placeholder="Search projects, skills, categories" aria-label="Search" />
        <Select name="type" defaultValue={type ?? ""} aria-label="Collaboration type"><option value="">All collaboration types</option>{Object.entries(COLLAB_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        <Button type="submit"><Search className="size-4" />Search</Button>
      </form>
      {projects.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const c = COLLAB_LABEL[p.collabType]!;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group">
                <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <div className="flex items-center justify-between gap-2"><Badge tone={c.tone as Tone}>{c.label}</Badge><span className="text-xs text-stone-400">{timeAgo(p.createdAt)}</span></div>
                  <p className="mt-3 font-display text-lg font-bold group-hover:text-brand-800">{p.name}</p>
                  <p className="text-xs text-stone-500">{p.category} · {p.stage} · by {p.owner.name}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-stone-600">{p.description}</p>
                  <div className="mt-auto pt-4">
                    <div className="flex flex-wrap gap-1">{p.skills.slice(0, 4).map((s) => <Badge key={s.skillId}>{s.skill.name}</Badge>)}</div>
                    <p className="mt-3 flex items-center gap-3 text-xs text-stone-500"><span className="flex items-center gap-1"><Users className="size-3.5" />{p._count.applications}/{p.contributorsNeeded} joined</span><span className="flex items-center gap-1"><MapPin className="size-3.5" />{p.isRemote ? "Remote" : p.city}</span></p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : <EmptyState title="No projects found" body="Be the first — publish your project and find contributors." action={<LinkButton href="/projects/new">Publish a project</LinkButton>} />}
    </div>
  );
}
