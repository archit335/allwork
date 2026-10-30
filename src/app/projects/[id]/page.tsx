import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Users, Layers } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decideApplicationAction, withdrawApplicationAction, toggleProjectStatusAction, inviteContributorAction } from "@/app/actions/projects";
import { ActionButton } from "@/components/action-button";
import { ApplyForm } from "@/components/forms/project-forms";
import { Alert, Avatar, Badge, Card, LinkButton, type Tone } from "@/components/ui";
import { COLLAB_LABEL, formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const p = await db.project.findUnique({ where: { id }, select: { name: true } });
  return { title: p?.name ?? "Project" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const [user, p] = await Promise.all([
    getCurrentUser(),
    db.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        skills: { include: { skill: true } },
        applications: { include: { user: { select: { id: true, name: true, avatarUrl: true, workerProfile: { select: { headline: true } }, skills: { include: { skill: true }, take: 4 } } } }, orderBy: { createdAt: "desc" } },
      },
    }),
  ]);
  if (!p) notFound();
  const isOwner = user?.id === p.ownerId;
  const c = COLLAB_LABEL[p.collabType]!;
  const accepted = p.applications.filter((a) => a.status === "ACCEPTED");
  const mine = user ? p.applications.find((a) => a.userId === user.id) : undefined;

  // Contributor discovery: rank people by skill overlap, experience and reliability
  let recommended: { id: string; name: string; avatarUrl: string | null; headline: string | null; matched: string[]; score: number }[] = [];
  if (isOwner) {
    const skillIds = p.skills.map((s) => s.skillId);
    const appliedIds = new Set(p.applications.map((a) => a.userId));
    const people = await db.user.findMany({
      where: { id: { not: p.ownerId }, skills: { some: { skillId: { in: skillIds } } } },
      include: { workerProfile: true, skills: { include: { skill: true } } },
      take: 200,
    });
    recommended = people
      .filter((u) => !appliedIds.has(u.id))
      .map((u) => {
        const matched = u.skills.filter((s) => skillIds.includes(s.skillId));
        const wp = u.workerProfile;
        const score = matched.length / Math.max(1, skillIds.length) * 0.6 + Math.min(1, (wp?.experienceYears ?? 0) / 5) * 0.2 + ((wp?.reliabilityScore ?? 70) / 100) * 0.1 + (p.isRemote ? (wp?.remoteOk ? 0.1 : 0.05) : u.city === p.city ? 0.1 : 0);
        return { id: u.id, name: u.name, avatarUrl: u.avatarUrl, headline: wp?.headline ?? null, matched: matched.map((m) => m.skill.name), score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {sp.created ? <div className="mb-6"><Alert tone="emerald"><strong>Project published!</strong> Below are people whose skills match — invite them, or wait for applications.</Alert></div> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap gap-2"><Badge tone={c.tone as Tone}>{c.label}</Badge><Badge>{p.category}</Badge><Badge>{p.stage}</Badge>{p.status === "CLOSED" ? <Badge tone="red">closed</Badge> : null}</div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">{p.name}</h1>
            <p className="mt-1 text-sm text-stone-500">by {p.owner.name} · {formatDate(p.createdAt)}</p>
            <p className="mt-4 whitespace-pre-line text-stone-700">{p.description}</p>
            <dl className="mt-6 grid gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2">
              <div className="flex gap-2"><Users className="size-5 text-brand-600" /><div><dt className="text-xs text-stone-500">Contributors</dt><dd className="text-sm font-semibold">{accepted.length}/{p.contributorsNeeded} joined</dd></div></div>
              <div className="flex gap-2"><MapPin className="size-5 text-brand-600" /><div><dt className="text-xs text-stone-500">Where</dt><dd className="text-sm font-semibold">{p.isRemote ? "Remote" : p.city}</dd></div></div>
              <div className="flex gap-2"><Clock className="size-5 text-brand-600" /><div><dt className="text-xs text-stone-500">Duration · hours</dt><dd className="text-sm font-semibold">{p.duration ?? "Flexible"} · {p.workingHours ?? "Flexible"}</dd></div></div>
              <div className="flex gap-2"><Layers className="size-5 text-brand-600" /><div><dt className="text-xs text-stone-500">Skills needed</dt><dd className="text-sm font-semibold">{p.skills.map((s) => s.skill.name).join(", ")}</dd></div></div>
            </dl>
            {p.responsibilities ? <><h2 className="mt-6 font-semibold">Responsibilities</h2><p className="mt-1 whitespace-pre-line text-sm text-stone-700">{p.responsibilities}</p></> : null}
          </Card>

          <Card className={`border-2 p-5 ${c.paid ? "border-emerald-300" : "border-amber-300"}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Compensation terms</p>
            <p className="mt-1 font-display text-lg font-bold">{c.label}</p>
            <p className="mt-1 text-stone-700">{p.compensationTerms}</p>
            {!c.paid ? <p className="mt-2 text-xs text-amber-800">This is a collaboration, not paid employment.</p> : null}
          </Card>

          {isOwner ? (
            <>
              <section>
                <h2 className="mb-3 font-display text-xl font-bold">Received applications</h2>
                {p.applications.length ? (
                  <div className="space-y-3">
                    {p.applications.map((a) => (
                      <Card key={a.id} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link href={`/workers/${a.user.id}`} className="flex items-center gap-3">
                            <Avatar name={a.user.name} src={a.user.avatarUrl} />
                            <div><p className="font-semibold">{a.user.name}</p><p className="text-xs text-stone-500">{a.role ?? "General"} · {a.user.skills.map((s) => s.skill.name).join(", ")}</p></div>
                          </Link>
                          <Badge tone={a.status === "ACCEPTED" ? "emerald" : a.status === "PENDING" ? "amber" : "slate"}>{a.status.toLowerCase()}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-stone-700">{a.message}</p>
                        {a.status === "PENDING" ? (
                          <div className="mt-3 flex gap-2">
                            <ActionButton size="sm" action={decideApplicationAction.bind(null, a.id, "ACCEPTED")}>Accept</ActionButton>
                            <ActionButton size="sm" variant="ghost" action={decideApplicationAction.bind(null, a.id, "REJECTED")}>Reject</ActionButton>
                          </div>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                ) : <p className="text-sm text-stone-500">No applications yet.</p>}
              </section>
              <section>
                <h2 className="mb-1 font-display text-xl font-bold">Recommended contributors</h2>
                <p className="mb-3 text-sm text-stone-500">Ranked by matching skills, experience, reliability and location fit.</p>
                {recommended.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recommended.map((r) => (
                      <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
                        <Link href={`/workers/${r.id}`} className="flex min-w-0 items-center gap-3">
                          <Avatar name={r.name} src={r.avatarUrl} />
                          <div className="min-w-0"><p className="truncate font-semibold">{r.name}</p><p className="truncate text-xs text-stone-500">{r.matched.join(", ")}</p></div>
                        </Link>
                        <ActionButton size="sm" variant="secondary" action={inviteContributorAction.bind(null, p.id, r.id)}>Invite</ActionButton>
                      </Card>
                    ))}
                  </div>
                ) : <p className="text-sm text-stone-500">No matching people yet — as people join with these skills they&apos;ll appear here.</p>}
              </section>
            </>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            {isOwner ? (
              <div className="space-y-3">
                <p className="font-semibold">You own this project</p>
                <ActionButton variant="secondary" action={toggleProjectStatusAction.bind(null, p.id)}>{p.status === "OPEN" ? "Close applications" : "Reopen applications"}</ActionButton>
              </div>
            ) : !user ? (
              <><p className="font-semibold">Want to contribute?</p><LinkButton href={`/login?next=/projects/${p.id}`} className="mt-3 w-full">Log in to apply</LinkButton></>
            ) : mine && mine.status !== "WITHDRAWN" ? (
              <div className="space-y-3">
                <p className="font-semibold">Your application: <Badge tone={mine.status === "ACCEPTED" ? "emerald" : mine.status === "PENDING" ? "amber" : "slate"}>{mine.status.toLowerCase()}</Badge></p>
                {mine.status === "ACCEPTED" ? <p className="text-sm text-stone-600">You&apos;re an active collaborator. Coordinate with {p.owner.name} on next steps.</p> : null}
                {["PENDING", "ACCEPTED"].includes(mine.status) ? <ActionButton variant="ghost" size="sm" action={withdrawApplicationAction.bind(null, p.id)} confirm="Withdraw from this project?">Withdraw</ActionButton> : null}
              </div>
            ) : p.status === "OPEN" ? (
              <ApplyForm projectId={p.id} collabLabel={c.label} terms={p.compensationTerms} skills={p.skills.map((s) => s.skill.name)} />
            ) : <p className="text-sm text-stone-600">This project is closed to new applications.</p>}
          </Card>
          <Card className="flex items-center gap-3 p-5"><Avatar name={p.owner.name} src={p.owner.avatarUrl} /><div><p className="font-semibold">{p.owner.name}</p><p className="text-xs text-stone-500">Project owner</p></div></Card>
          {accepted.length ? (
            <Card className="p-5">
              <p className="mb-2 font-semibold">Team</p>
              <ul className="space-y-2">{accepted.map((a) => <li key={a.id} className="flex items-center gap-2 text-sm"><Avatar name={a.user.name} size={26} />{a.user.name} <span className="text-stone-400">· {a.role}</span></li>)}</ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
