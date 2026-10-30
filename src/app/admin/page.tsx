import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewVerificationAction, resolveDisputeAction, closeReportAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/action-button";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { formatINR, timeAgo } from "@/lib/utils";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const [users, workers, clients, projects, activeJobs, completedJobs, revenue, verifications, disputes, reports, matchStats, categories, logs] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { skills: { some: {} } } }),
    db.user.count({ where: { jobsPosted: { some: {} } } }),
    db.project.count(),
    db.job.count({ where: { status: { in: ["OPEN", "FILLED", "IN_PROGRESS"] } } }),
    db.job.count({ where: { status: "COMPLETED" } }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true, commission: true } }),
    db.verification.findMany({ where: { status: "PENDING" }, include: { user: { select: { name: true, phone: true } } }, orderBy: { createdAt: "asc" } }),
    db.dispute.findMany({ where: { status: "OPEN" }, include: { raisedBy: { select: { name: true } }, booking: { include: { job: { select: { title: true } } } } } }),
    db.report.findMany({ where: { status: "OPEN" }, include: { reporter: { select: { name: true } }, target: { select: { name: true } } } }),
    db.jobMatch.groupBy({ by: ["status"], _count: true }),
    db.skill.groupBy({ by: ["category"], _count: true, orderBy: { _count: { category: "desc" } } }),
    db.adminLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const totalMatches = matchStats.reduce((a, m) => a + m._count, 0);
  const accepted = matchStats.find((m) => m.status === "ACCEPTED")?._count ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader title="Admin dashboard" subtitle="Platform health, trust & safety." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <Stat label="Total users" value={users} />
        <Stat label="Workers" value={workers} hint="with ≥1 skill" />
        <Stat label="Clients / employers" value={clients} hint="posted ≥1 job" />
        <Stat label="Projects" value={projects} />
        <Stat label="Active jobs" value={activeJobs} />
        <Stat label="Completed jobs" value={completedJobs} />
        <Stat label="GMV (test)" value={formatINR(revenue._sum.amount ?? 0)} />
        <Stat label="Commission (test)" value={formatINR(revenue._sum.commission ?? 0)} />
        <Stat label="Requests sent" value={totalMatches} />
        <Stat label="Accept rate" value={totalMatches ? `${Math.round((accepted / totalMatches) * 100)}%` : "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Verification requests ({verifications.length})</h2>
          {verifications.length ? verifications.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 py-3 text-sm first:border-0">
              <div><p className="font-semibold">{v.user.name} <Badge>{v.type.toLowerCase()}</Badge></p><p className="text-stone-600">{v.details}</p><p className="text-xs text-stone-400">{v.user.phone} · {timeAgo(v.createdAt)}</p></div>
              <div className="flex gap-2"><ActionButton size="sm" action={reviewVerificationAction.bind(null, v.id, true)}>Approve</ActionButton><ActionButton size="sm" variant="ghost" action={reviewVerificationAction.bind(null, v.id, false)}>Reject</ActionButton></div>
            </div>
          )) : <p className="text-sm text-stone-500">Queue is empty.</p>}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Open disputes ({disputes.length})</h2>
          {disputes.length ? disputes.map((d) => (
            <div key={d.id} className="border-t border-stone-100 py-3 text-sm first:border-0">
              <p className="font-semibold">{d.booking.job.title}</p>
              <p className="text-stone-600">{d.raisedBy.name}: {d.reason}</p>
              <div className="mt-2 flex gap-2">
                <ActionButton size="sm" action={resolveDisputeAction.bind(null, d.id, "Resolved in favour of the client; refund issued.")}>Favour client</ActionButton>
                <ActionButton size="sm" variant="secondary" action={resolveDisputeAction.bind(null, d.id, "Resolved in favour of the worker; payment stands.")}>Favour worker</ActionButton>
              </div>
            </div>
          )) : <p className="text-sm text-stone-500">No open disputes.</p>}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">User reports ({reports.length})</h2>
          {reports.length ? reports.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 border-t border-stone-100 py-3 text-sm first:border-0">
              <p><strong>{r.reporter.name}</strong> reported <strong>{r.target.name}</strong>: {r.reason}</p>
              <ActionButton size="sm" variant="ghost" action={closeReportAction.bind(null, r.id)}>Close</ActionButton>
            </div>
          )) : <p className="text-sm text-stone-500">No open reports.</p>}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Categories & matching</h2>
          <div className="flex flex-wrap gap-1.5">{categories.map((c) => <Badge key={c.category}>{c.category} · {c._count}</Badge>)}</div>
          <div className="mt-4 flex flex-wrap gap-1.5">{matchStats.map((m) => <Badge key={m.status} tone="brand">{m.status.toLowerCase()} · {m._count}</Badge>)}</div>
          <h3 className="mb-2 mt-5 text-sm font-semibold">Recent admin actions</h3>
          <ul className="space-y-1 text-xs text-stone-600">{logs.map((l) => <li key={l.id}>{l.action} · {l.detail ?? l.targetId} · {timeAgo(l.createdAt)}</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
