import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { COLLAB_LABEL } from "@/lib/utils";

export const metadata = { title: "Projects & applications" };

export default async function DashProjects() {
  const user = await requireUser("/dashboard/projects");
  const [mine, apps] = await Promise.all([
    db.project.findMany({ where: { ownerId: user.id }, include: { _count: { select: { applications: true } }, applications: { where: { status: { in: ["PENDING", "ACCEPTED"] } }, select: { status: true } } }, orderBy: { createdAt: "desc" } }),
    db.projectApplication.findMany({ where: { userId: user.id }, include: { project: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const active = apps.filter((a) => a.status === "ACCEPTED");
  return (
    <div className="space-y-8">
      <PageHeader title="Projects & applications" subtitle="Your projects, received applications and active collaborations." action={<div className="flex gap-2"><LinkButton href="/projects" variant="secondary">Discover</LinkButton><LinkButton href="/projects/new">New project</LinkButton></div>} />
      <section>
        <h2 className="mb-3 font-semibold">My projects</h2>
        {mine.length ? (
          <Card className="divide-y divide-stone-100">
            {mine.map((p) => {
              const pending = p.applications.filter((a) => a.status === "PENDING").length;
              const joined = p.applications.filter((a) => a.status === "ACCEPTED").length;
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-stone-50">
                  <div><p className="font-semibold">{p.name}</p><p className="text-xs text-stone-500">{COLLAB_LABEL[p.collabType]?.label} · {joined}/{p.contributorsNeeded} joined</p></div>
                  <div className="flex gap-2">{pending ? <Badge tone="orange">{pending} to review</Badge> : null}<Badge tone={p.status === "OPEN" ? "emerald" : "slate"}>{p.status.toLowerCase()}</Badge></div>
                </Link>
              );
            })}
          </Card>
        ) : <EmptyState title="No projects yet" body="Building something? Publish it and find people to build with." action={<LinkButton href="/projects/new">Publish a project</LinkButton>} />}
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Active collaborations</h2>
        {active.length ? (
          <div className="grid gap-3 sm:grid-cols-2">{active.map((a) => <Link key={a.id} href={`/projects/${a.projectId}`}><Card className="p-4 hover:border-brand-300"><p className="font-semibold">{a.project.name}</p><p className="text-xs text-stone-500">{a.role ?? "Contributor"} · {COLLAB_LABEL[a.project.collabType]?.label}</p></Card></Link>)}</div>
        ) : <p className="text-sm text-stone-500">None yet.</p>}
      </section>
      <section>
        <h2 className="mb-3 font-semibold">My applications</h2>
        {apps.length ? (
          <Card className="divide-y divide-stone-100">
            {apps.map((a) => (
              <Link key={a.id} href={`/projects/${a.projectId}`} className="flex items-center justify-between gap-3 p-4 hover:bg-stone-50">
                <span className="font-medium">{a.project.name}</span>
                <Badge tone={a.status === "ACCEPTED" ? "emerald" : a.status === "PENDING" ? "amber" : "slate"}>{a.status.toLowerCase()}</Badge>
              </Link>
            ))}
          </Card>
        ) : <p className="text-sm text-stone-500">You haven&apos;t applied to any projects.</p>}
      </section>
    </div>
  );
}
