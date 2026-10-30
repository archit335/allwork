import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sweepExpiredReservations } from "@/lib/allocation";
import { acceptRequestAction, rejectRequestAction } from "@/app/actions/jobs";
import { ActionButton } from "@/components/action-button";
import { Countdown } from "@/components/countdown";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatDate, formatINR, timeAgo } from "@/lib/utils";

export const metadata = { title: "Work requests" };

export default async function RequestsPage() {
  const user = await requireUser("/dashboard/requests");
  await sweepExpiredReservations();
  const [matches, held] = await Promise.all([
    db.jobMatch.findMany({
      where: { workerId: user.id, status: { in: ["SENT", "WAITLISTED"] }, job: { status: "OPEN" } },
      include: { job: { include: { skills: { include: { skill: true } }, _count: { select: { reservations: { where: { status: { in: ["HELD", "PROPOSED", "SELECTED"] } } } } } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.reservation.findMany({ where: { workerId: user.id, status: "HELD" }, include: { job: true }, orderBy: { expiresAt: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Work requests" subtitle="Jobs matched to your skills, location and availability. First eligible workers to accept reserve a position." />

      {held.length ? (
        <section>
          <h2 className="mb-3 font-semibold">⏳ Reserved — send your proposal</h2>
          <div className="space-y-2">
            {held.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-accent-400 p-4">
                <div>
                  <p className="font-semibold">{r.job.title}</p>
                  <p className="text-sm text-stone-600">Expires in <Countdown to={r.expiresAt.toISOString()} className="font-mono font-bold text-accent-600" /></p>
                </div>
                <LinkButton href={`/jobs/${r.jobId}`} variant="accent">Send price & availability</LinkButton>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {matches.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {matches.map((m) => {
            const j = m.job;
            const reserved = j._count.reservations;
            return (
              <Card key={m.id} className="overflow-hidden p-0">
                <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-5 py-3 text-white">
                  <span className="text-sm font-bold uppercase tracking-wider">{m.status === "WAITLISTED" ? "Waitlisted" : "⚡ New work request!"}</span>
                  <span className="text-xs text-white/80">{Math.round(m.score * 100)}% match · {timeAgo(m.createdAt)}</span>
                </div>
                <div className="p-5">
                  <Link href={`/jobs/${j.id}`} className="font-display text-lg font-bold hover:text-brand-700">{j.title}</Link>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{j.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
                    <span className="flex items-center gap-1.5"><MapPin className="size-4 text-stone-400" />{j.isRemote ? "Remote" : `${j.city ?? "—"}${m.distanceKm != null ? ` · ${m.distanceKm} km` : ""}`}</span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-stone-400" />{formatDate(j.startDate)}{j.startTime ? ` · ${j.startTime}` : ""}</span>
                    <span className="flex items-center gap-1.5"><Clock className="size-4 text-stone-400" />{j.durationText ?? (j.durationHours ? `${j.durationHours}h` : "Flexible")}</span>
                    <span className="flex items-center gap-1.5"><Wallet className="size-4 text-stone-400" />{j.budgetMax ? `up to ${formatINR(j.budgetMax)}` : "Open to proposals"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{j.skills.map((s) => <Badge key={s.skillId}>{s.skill.name}</Badge>)}</div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-800"><Users className="size-3.5" />{reserved}/{j.workersNeeded} positions reserved</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ActionButton variant="zap" action={acceptRequestAction.bind(null, j.id)} pendingText="Reserving…">ACCEPT REQUEST</ActionButton>
                    <ActionButton variant="secondary" action={rejectRequestAction.bind(null, j.id)} showOk={false}>REJECT REQUEST</ActionButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No new requests right now" body="Requests arrive here (and as notifications) when someone posts work that matches your skills and location. Adding more skills and availability helps." action={<LinkButton href="/work" variant="secondary">Browse open work</LinkButton>} />
      )}
    </div>
  );
}
