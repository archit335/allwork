import Link from "next/link";
import { ArrowRight, Inbox, Megaphone, Rocket, Search, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Alert, Badge, Card, LinkButton, Stat } from "@/components/ui";
import { formatDateTime, formatINR, timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const user = await requireUser("/dashboard");
  const [profile, skillCount, newRequests, activeProposals, upcoming, myOpenJobs, pendingProposals, earnings, myProjects, notes] = await Promise.all([
    db.workerProfile.findUnique({ where: { userId: user.id } }),
    db.userSkill.count({ where: { userId: user.id } }),
    db.jobMatch.count({ where: { workerId: user.id, status: "SENT", job: { status: "OPEN" } } }),
    db.proposal.count({ where: { workerId: user.id, status: "SUBMITTED" } }),
    db.booking.findMany({
      where: { OR: [{ workerId: user.id }, { clientId: user.id }], status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      include: { job: { select: { title: true } }, worker: { select: { name: true } }, client: { select: { name: true } } },
      orderBy: { start: "asc" }, take: 5,
    }),
    db.job.count({ where: { clientId: user.id, status: "OPEN" } }),
    db.proposal.count({ where: { job: { clientId: user.id }, status: "SUBMITTED" } }),
    db.payment.aggregate({ where: { booking: { workerId: user.id }, status: "PAID" }, _sum: { workerEarning: true } }),
    db.project.count({ where: { ownerId: user.id } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const checklist = [
    { done: user.phoneVerified, label: "Verify your phone", href: "/verify" },
    { done: skillCount > 0, label: "Add your skills", href: "/dashboard/profile#skills" },
    { done: !!profile?.headline, label: "Write a headline", href: "/dashboard/profile" },
    { done: (await db.availabilitySlot.count({ where: { userId: user.id } })) > 0, label: "Set weekly availability", href: "/dashboard/calendar" },
  ];
  const remaining = checklist.filter((c) => !c.done);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-white sm:p-8">
        <div aria-hidden className="animate-blob absolute -left-20 -top-24 size-72 rounded-full bg-brand-600/60 blur-3xl" />
        <div aria-hidden className="animate-blob absolute -right-16 top-0 size-64 rounded-full bg-accent-500/45 blur-3xl [animation-delay:-5s]" />
        <div aria-hidden className="animate-blob absolute -bottom-28 left-1/3 size-64 rounded-full bg-zap-400/25 blur-3xl [animation-delay:-9s]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-zap-300">Your dashboard</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              Namaste, <span className="text-gradient">{user.name.split(" ")[0]}</span> 👋
            </h1>
            <p className="mt-2 text-white/70">One account — find work, hire, and collaborate.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/post" variant="zap"><Megaphone className="size-4" />Post any work</LinkButton>
            <LinkButton href="/work" className="bg-white/10 text-white hover:bg-white/20">Find work</LinkButton>
          </div>
        </div>
      </section>

      {remaining.length ? (
        <div className="rounded-3xl border-2 border-brand-500 bg-surface p-5 shadow-[6px_6px_0_0] shadow-brand-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display font-extrabold"><ShieldAlert className="size-5 text-accent-500" />Get matched to more work</p>
            <span className="text-sm font-bold text-brand-700">{checklist.length - remaining.length}/{checklist.length} done</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-50">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-accent-500 to-zap-400" style={{ width: `${((checklist.length - remaining.length) / checklist.length) * 100}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {remaining.map((c) => <Link key={c.label} href={c.href} className="rounded-full bg-zap-400 px-3.5 py-1.5 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-zap-300">{c.label} →</Link>)}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="violet" label="New work requests" value={newRequests} />
        <Stat tone="pink" label="Proposals pending" value={activeProposals} hint="awaiting client decision" />
        <Stat tone="lime" label="Earnings (paid)" value={formatINR(earnings._sum.workerEarning ?? 0)} />
        <Stat tone="ink" label="Reliability" value={`${Math.round(profile?.reliabilityScore ?? 70)}/100`} hint={profile?.ratingCount ? `★ ${profile.ratingAvg.toFixed(1)} from ${profile.ratingCount}` : "No ratings yet"} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <QuickCard tone="bg-zap-400 text-ink" href="/dashboard/requests" icon={Inbox} title="Worker" body={newRequests ? `${newRequests} request${newRequests > 1 ? "s" : ""} waiting — be first to accept` : "No new requests. Keep your profile fresh."} />
        <QuickCard tone="bg-accent-500 text-white" href="/dashboard/jobs" icon={Search} title="Client" body={`${myOpenJobs} open job${myOpenJobs === 1 ? "" : "s"} · ${pendingProposals} proposal${pendingProposals === 1 ? "" : "s"} to review`} />
        <QuickCard tone="bg-brand-500 text-white" href="/dashboard/projects" icon={Rocket} title="Collaborator" body={myProjects ? `${myProjects} project${myProjects > 1 ? "s" : ""} published` : "Publish a project and find contributors"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3 font-display text-lg font-extrabold">📅 Upcoming bookings</p>
          {upcoming.length ? (
            <ul className="divide-y divide-stone-100">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link href={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand-700">
                    <span className="min-w-0"><span className="block truncate font-medium">{b.job.title}</span><span className="text-xs text-stone-500">{b.workerId === user.id ? `for ${b.client.name}` : `with ${b.worker.name}`} · {formatDateTime(b.start)}</span></span>
                    <Badge tone={b.workerId === user.id ? "brand" : "violet"}>{b.workerId === user.id ? "working" : "hiring"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-stone-500">Nothing scheduled.</p>}
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><p className="font-display text-lg font-extrabold">⚡ Recent activity</p><Link href="/notifications" className="text-sm font-medium text-brand-700">All</Link></div>
          {notes.length ? (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="text-sm">
                  <Link href={n.link ?? "/notifications"} className="hover:text-brand-700"><span className="font-medium">{n.title}</span> <span className="text-stone-500">· {n.body}</span></Link>
                  <span className="block text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-stone-500">No activity yet.</p>}
        </Card>
      </div>
      {!user.phoneVerified ? <Alert tone="amber">Your phone isn&apos;t verified yet. Verified workers rank higher in matching. <Link href="/verify" className="font-semibold underline">Verify now</Link></Alert> : null}
    </div>
  );
}

function QuickCard({ href, icon: Icon, title, body, tone }: { href: string; icon: typeof Inbox; title: string; body: string; tone: string }) {
  return (
    <Link href={href} className={`group relative overflow-hidden rounded-3xl p-6 shadow-lg transition hover:-translate-y-1 hover:rotate-[-0.6deg] ${tone}`}>
      <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
      <Icon className="size-7" />
      <p className="mt-5 font-display text-xl font-extrabold uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-sm opacity-80">{body}</p>
      <ArrowRight className="mt-4 size-5 transition group-hover:translate-x-1.5" />
    </Link>
  );
}
