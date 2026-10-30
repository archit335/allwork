import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, LinkButton, PageHeader, type Tone } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata = { title: "My jobs" };
const TONE: Record<string, Tone> = { OPEN: "emerald", FILLED: "brand", IN_PROGRESS: "sky", COMPLETED: "slate", CANCELLED: "red" };

export default async function MyJobsPage() {
  const user = await requireUser("/dashboard/jobs");
  const jobs = await db.job.findMany({
    where: { clientId: user.id },
    include: {
      _count: { select: { matches: true, proposals: { where: { status: "SUBMITTED" } } } },
      reservations: { where: { status: { in: ["HELD", "PROPOSED", "SELECTED"] } }, select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="My jobs" subtitle="Work you've posted, proposals received and hiring progress." action={<LinkButton href="/post" variant="accent">Post any work</LinkButton>} />
      {jobs.length ? (
        <div className="grid gap-3">
          {jobs.map((j) => {
            const hired = j.reservations.filter((r) => r.status === "SELECTED").length;
            return (
              <Link key={j.id} href={`/jobs/${j.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-4 p-4 transition hover:border-brand-300">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><Badge tone={TONE[j.status]}>{j.status.toLowerCase()}</Badge><span className="text-xs text-stone-400">{timeAgo(j.createdAt)}</span></div>
                    <p className="mt-1.5 font-semibold">{j.title}</p>
                    <p className="text-sm text-stone-500">{j.isRemote ? "Remote" : j.city} · {formatDate(j.startDate)}</p>
                  </div>
                  <div className="flex gap-6 text-center text-sm">
                    <div><p className="font-display text-xl font-bold">{j._count.matches}</p><p className="text-xs text-stone-500">notified</p></div>
                    <div><p className="font-display text-xl font-bold text-accent-600">{j._count.proposals}</p><p className="text-xs text-stone-500">to review</p></div>
                    <div><p className="font-display text-xl font-bold text-brand-700">{hired}/{j.workersNeeded}</p><p className="text-xs text-stone-500">hired</p></div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState title="You haven't posted any work yet" body="Describe what you need in your own words — the assistant does the rest." action={<LinkButton href="/post" variant="accent">Post any work</LinkButton>} />
      )}
    </div>
  );
}
