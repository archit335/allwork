import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, LinkButton, PageHeader, type Tone } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "My proposals" };
const TONE: Record<string, Tone> = { SUBMITTED: "amber", ACCEPTED: "emerald", REJECTED: "slate", WITHDRAWN: "slate" };

export default async function ProposalsPage() {
  const user = await requireUser("/dashboard/proposals");
  const proposals = await db.proposal.findMany({ where: { workerId: user.id }, include: { job: true, booking: { select: { id: true } } }, orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <PageHeader title="My proposals" subtitle="Your price & availability submissions. Clients compare and choose." />
      {proposals.length ? (
        <Card className="divide-y divide-stone-100">
          {proposals.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link href={`/jobs/${p.jobId}`} className="font-semibold hover:text-brand-700">{p.job.title}</Link>
                <p className="text-sm text-stone-500">{formatINR(p.totalEstimate)} · {formatDate(p.availableDate)} {p.startTime}–{p.endTime}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={TONE[p.status]}>{p.status === "SUBMITTED" ? "awaiting client" : p.status.toLowerCase()}</Badge>
                {p.booking ? <LinkButton href={`/bookings/${p.booking.id}`} size="sm">Booking</LinkButton> : null}
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState title="No proposals yet" body="Accept a work request to reserve a position, then send your price and availability." action={<LinkButton href="/dashboard/requests">See requests</LinkButton>} />
      )}
    </div>
  );
}
