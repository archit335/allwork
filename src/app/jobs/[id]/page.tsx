import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users, Wallet, Zap, Paperclip, History } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sweepExpiredReservations, RESERVATION_MINUTES } from "@/lib/allocation";
import {
  acceptRequestAction, rejectRequestAction, expressInterestAction, withdrawAction, selectProposalAction,
  declineProposalAction, redispatchAction, cancelJobAction,
} from "@/app/actions/jobs";
import { Alert, Avatar, Badge, Card, LinkButton, type Tone } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { Countdown } from "@/components/countdown";
import { ProposalForm } from "@/components/forms/proposal-form";
import { ProposalCompare, type CompareItem } from "@/components/proposal-compare";
import { WORK_TYPE_LABEL, formatDate, formatINR, formatDateTime, timeAgo } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id }, select: { title: true } });
  return { title: job?.title ?? "Job" };
}

const STATUS_TONE: Record<string, Tone> = { OPEN: "emerald", FILLED: "brand", IN_PROGRESS: "sky", COMPLETED: "slate", CANCELLED: "red" };

function budgetText(j: { budgetMin: number | null; budgetMax: number | null; budgetUnit: string | null }) {
  if (j.budgetMin == null && j.budgetMax == null) return "Open to proposals";
  const unit = j.budgetUnit ? { HOUR: "/hour", DAY: "/day", TOTAL: " total", MONTH: "/month" }[j.budgetUnit] : "";
  return j.budgetMin === j.budgetMax || j.budgetMax == null ? `${formatINR(j.budgetMin)}${unit}` : `${formatINR(j.budgetMin)}–${formatINR(j.budgetMax)}${unit}`;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function JobPage({ params, searchParams }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  await sweepExpiredReservations(id);
  const [user, job] = await Promise.all([
    getCurrentUser(),
    db.job.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true, phoneVerified: true, createdAt: true } },
        skills: { include: { skill: true } },
        _count: { select: { matches: true } },
      },
    }),
  ]);
  if (!job) notFound();

  const isOwner = user?.id === job.clientId;
  const reservations = await db.reservation.findMany({
    where: { jobId: id },
    include: {
      worker: { select: { id: true, name: true, avatarUrl: true, phoneVerified: true, idVerified: true, workerProfile: true, skills: { include: { skill: true } } } },
      proposal: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const active = reservations.filter((r) => ["HELD", "PROPOSED", "SELECTED"].includes(r.status));
  const selected = reservations.filter((r) => r.status === "SELECTED").length;
  const myMatch = user && !isOwner ? await db.jobMatch.findUnique({ where: { jobId_workerId: { jobId: id, workerId: user.id } } }) : null;
  const myRes = user ? reservations.find((r) => r.workerId === user.id) : undefined;
  const myBooking = myRes?.status === "SELECTED" && myRes.proposal ? await db.booking.findUnique({ where: { proposalId: myRes.proposal.id }, select: { id: true } }) : null;

  const jobSkillIds = new Set(job.skills.map((s) => s.skillId));
  const matchesById = isOwner
    ? new Map((await db.jobMatch.findMany({ where: { jobId: id }, select: { workerId: true, distanceKm: true } })).map((m) => [m.workerId, m]))
    : new Map<string, { distanceKm: number | null }>();

  const compare: CompareItem[] = isOwner
    ? reservations
        .filter((r) => r.proposal && ["SUBMITTED", "ACCEPTED"].includes(r.proposal.status))
        .map((r) => {
          const p = r.proposal!;
          const wp = r.worker.workerProfile;
          const skill = r.worker.skills.find((s) => jobSkillIds.has(s.skillId))?.skill.name ?? r.worker.skills[0]?.skill.name ?? "Worker";
          return {
            proposalId: p.id,
            workerId: r.workerId,
            name: r.worker.name,
            avatarUrl: r.worker.avatarUrl,
            skill,
            experienceYears: wp?.experienceYears ?? 0,
            total: p.totalEstimate,
            pricing: `${p.pricingType === "HOURLY" ? `${formatINR(p.rate)}/hr` : p.pricingType === "DAILY" ? `${formatINR(p.rate)}/day` : "Fixed price"}${p.extraCharges ? ` + ${formatINR(p.extraCharges)} extra` : ""}`,
            date: p.availableDate.toISOString(),
            dateLabel: formatDate(p.availableDate),
            window: `${p.startTime}–${p.endTime}`,
            rating: wp?.ratingAvg ?? 0,
            ratingCount: wp?.ratingCount ?? 0,
            reliability: wp?.reliabilityScore ?? 0,
            distanceKm: matchesById.get(r.workerId)?.distanceKm ?? null,
            completedJobs: wp?.completedJobs ?? 0,
            verified: r.worker.idVerified,
            note: p.note,
            status: p.status,
            startSort: p.availableDate.getTime() + Number(p.startTime.replace(":", "")) * 1000,
          };
        })
    : [];

  const events = isOwner ? await db.allocationEvent.findMany({ where: { jobId: id }, orderBy: { createdAt: "desc" }, take: 30 }) : [];
  const ownerBookings = isOwner ? await db.booking.findMany({ where: { jobId: id }, include: { worker: { select: { name: true } } } }) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {sp.posted ? (
        <div className="mb-6"><Alert tone="emerald"><strong>Published!</strong> Matching workers have been notified. The first to accept reserve positions and then send you their price and availability.</Alert></div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: job details */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[job.status]}>{job.status.replace("_", " ").toLowerCase()}</Badge>
              <Badge tone="brand">{job.category}</Badge>
              <Badge>{WORK_TYPE_LABEL[job.workType]}</Badge>
              {job.urgency === "URGENT" || job.urgency === "HIGH" ? <Badge tone="orange"><Zap className="size-3" />{job.urgency.toLowerCase()}</Badge> : null}
              <span className="ml-auto text-xs text-stone-400">Posted {timeAgo(job.createdAt)}</span>
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{job.title}</h1>
            <p className="mt-3 whitespace-pre-line text-stone-700">{job.description}</p>
            <dl className="mt-6 grid gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <Detail icon={MapPin} label="Location" value={job.isRemote ? "Remote" : [job.address, job.city].filter(Boolean).join(", ") || "—"} />
              <Detail icon={CalendarDays} label="Date" value={`${formatDate(job.startDate)}${job.startTime ? ` · ${job.startTime}` : ""}`} />
              <Detail icon={Clock} label="Duration" value={job.durationText ?? (job.durationHours ? `${job.durationHours} hours` : "Flexible")} />
              <Detail icon={Users} label="Workers needed" value={String(job.workersNeeded)} />
              <Detail icon={Wallet} label="Budget" value={budgetText(job)} />
              <Detail icon={Zap} label="Experience" value={job.experienceRequired ?? "Not mandatory"} />
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {job.skills.map((s) => <Badge key={s.skillId}>{s.skill.name}</Badge>)}
            </div>
            {job.specialInstructions ? <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Instructions:</strong> {job.specialInstructions}</p> : null}
            {job.attachments.length ? (
              <div className="mt-4 space-y-1">
                {job.attachments.map((a) => (
                  <a key={a} href={a} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 text-sm text-brand-700 hover:underline"><Paperclip className="size-3.5" />{a}</a>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Owner: comparison */}
          {isOwner ? (
            <section>
              <h2 className="mb-4 font-display text-xl font-bold">Worker proposals</h2>
              {compare.length ? (
                <ProposalCompare
                  items={compare}
                  select={selectProposalAction}
                  decline={declineProposalAction.bind(null, id)}
                  canSelect={job.status === "OPEN"}
                />
              ) : (
                <Card className="p-8 text-center text-sm text-stone-500">
                  No proposals yet. Workers who accept your request have {RESERVATION_MINUTES} minutes to send their price and availability.
                </Card>
              )}
              {ownerBookings.length ? (
                <div className="mt-6">
                  <h3 className="mb-2 font-semibold">Bookings</h3>
                  <div className="space-y-2">
                    {ownerBookings.map((b) => (
                      <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center justify-between rounded-xl border border-stone-200 bg-surface px-4 py-3 text-sm hover:border-brand-300">
                        <span>{b.worker.name} · {formatDateTime(b.start)}</span>
                        <Badge tone={b.status === "CANCELLED" ? "red" : "emerald"}>{b.status.toLowerCase()}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          {/* Position tracker */}
          <Card className="p-5">
            <p className="text-sm font-semibold text-stone-600">Positions</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{active.length}<span className="text-lg text-stone-400">/{job.workersNeeded}</span></p>
            <p className="text-xs text-stone-500">reserved · {selected} hired · {job._count.matches} workers notified</p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100">
              <div className="bg-brand-700" style={{ width: `${(selected / job.workersNeeded) * 100}%` }} />
              <div className="bg-brand-300" style={{ width: `${((active.length - selected) / job.workersNeeded) * 100}%` }} />
            </div>
          </Card>

          {isOwner ? (
            <>
              <Card className="space-y-3 p-5">
                <p className="font-semibold">Manage job</p>
                {job.status === "OPEN" ? (
                  <div className="flex flex-col gap-2">
                    <ActionButton variant="secondary" action={redispatchAction.bind(null, id)} pendingText="Finding workers…">Send to more workers</ActionButton>
                    <ActionButton variant="ghost" action={cancelJobAction.bind(null, id)} confirm="Cancel this job? Reserved workers will be notified.">Cancel job</ActionButton>
                  </div>
                ) : <p className="text-sm text-stone-500">This job is {job.status.toLowerCase()}.</p>}
              </Card>
              {active.filter((r) => r.status === "HELD").length ? (
                <Card className="p-5">
                  <p className="mb-3 font-semibold">Awaiting proposals</p>
                  <ul className="space-y-2">
                    {active.filter((r) => r.status === "HELD").map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2"><Avatar name={r.worker.name} size={26} />{r.worker.name}</span>
                        <span className="font-mono text-xs text-stone-500"><Countdown to={r.expiresAt.toISOString()} /></span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              <Card className="p-5">
                <p className="mb-3 flex items-center gap-2 font-semibold"><History className="size-4" />Allocation history</p>
                <ol className="space-y-2 border-l border-stone-200 pl-4">
                  {events.map((e) => (
                    <li key={e.id} className="text-xs">
                      <span className="font-semibold text-stone-800">{e.type.replace("_", " ").toLowerCase()}</span>
                      <span className="text-stone-500"> · {e.detail} · {timeAgo(e.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </>
          ) : !user ? (
            <Card className="p-5">
              <p className="font-semibold">Want this work?</p>
              <p className="mt-1 text-sm text-stone-600">Log in so we can check if your skills and location match.</p>
              <LinkButton href={`/login?next=/jobs/${id}`} className="mt-4 w-full">Log in to respond</LinkButton>
            </Card>
          ) : (
            <WorkerPanel
              jobId={id}
              jobOpen={job.status === "OPEN"}
              matchStatus={myMatch?.status ?? null}
              reservation={myRes ? { status: myRes.status, expiresAt: myRes.expiresAt.toISOString(), proposal: myRes.proposal } : null}
              bookingId={myBooking?.id ?? null}
              defaultDate={job.startDate ? isoDate(job.startDate) : isoDate(new Date())}
              defaultStart={job.startTime ?? "09:00"}
              budgetHint={job.budgetMin != null ? `Client budget: ${budgetText(job)}` : undefined}
              durationHours={job.durationHours}
            />
          )}

          <Card className="flex items-center gap-3 p-5">
            <Avatar name={job.client.name} src={job.client.avatarUrl} />
            <div className="text-sm">
              <p className="font-semibold">{job.client.name}</p>
              <p className="text-xs text-stone-500">Client · joined {formatDate(job.client.createdAt)}{job.client.phoneVerified ? " · phone verified" : ""}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-brand-600" />
      <div>
        <dt className="text-xs text-stone-500">{label}</dt>
        <dd className="text-sm font-semibold text-ink">{value}</dd>
      </div>
    </div>
  );
}

function addHours(hhmm: string, h: number | null) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, (hh ?? 9) * 60 + (mm ?? 0) + Math.round((h ?? 8) * 60));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function WorkerPanel({
  jobId, jobOpen, matchStatus, reservation, bookingId, defaultDate, defaultStart, budgetHint, durationHours,
}: {
  jobId: string;
  jobOpen: boolean;
  matchStatus: string | null;
  reservation: { status: string; expiresAt: string; proposal: { pricingType: string; rate: number; extraCharges: number; availableDate: Date; startTime: string; endTime: string; estimatedCompletion: string | null; note: string | null; status: string } | null } | null;
  bookingId: string | null;
  defaultDate: string;
  defaultStart: string;
  budgetHint?: string;
  durationHours: number | null;
}) {
  if (reservation?.status === "SELECTED") {
    return (
      <Card className="border-emerald-300 bg-emerald-50 p-5">
        <p className="font-display text-lg font-bold text-emerald-900">You&apos;re hired 🎉</p>
        {bookingId ? <LinkButton href={`/bookings/${bookingId}`} className="mt-3 w-full">Open booking</LinkButton> : null}
      </Card>
    );
  }
  if (reservation && ["HELD", "PROPOSED"].includes(reservation.status) && jobOpen) {
    const p = reservation.proposal;
    return (
      <Card className="p-5">
        {reservation.status === "HELD" ? (
          <div className="mb-4 rounded-xl bg-accent-500/10 px-4 py-3 text-sm text-accent-600">
            <strong>Position reserved.</strong> Send your price & availability within <Countdown to={reservation.expiresAt} className="font-mono font-bold" /> or the spot is released.
          </div>
        ) : (
          <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900"><strong>Proposal sent.</strong> Your position stays reserved while the client decides. You can update it below.</div>
        )}
        <ProposalForm
          jobId={jobId}
          budgetHint={budgetHint}
          defaults={p ? {
            pricingType: p.pricingType, rate: p.rate, extraCharges: p.extraCharges, availableDate: isoDate(p.availableDate),
            startTime: p.startTime, endTime: p.endTime, estimatedCompletion: p.estimatedCompletion, note: p.note,
          } : { availableDate: defaultDate, startTime: defaultStart, endTime: addHours(defaultStart, durationHours) }}
        />
        <div className="mt-3 border-t border-stone-100 pt-3">
          <ActionButton variant="ghost" size="sm" action={withdrawAction.bind(null, jobId)} confirm="Release your reserved position?">Withdraw & release position</ActionButton>
        </div>
      </Card>
    );
  }
  if (!jobOpen) return <Card className="p-5 text-sm text-stone-600">This job is no longer accepting workers.</Card>;
  if (reservation) return <Card className="p-5 text-sm text-stone-600">Your reservation was {reservation.status.toLowerCase()}. You can&apos;t re-reserve this job.</Card>;
  if (matchStatus === "SENT" || matchStatus === "WAITLISTED") {
    return (
      <Card className="overflow-hidden p-0">
        <div className="bg-brand-700 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white">⚡ New work request!</div>
        <div className="p-5">
          {matchStatus === "WAITLISTED" ? <p className="mb-3 text-sm text-amber-800">You&apos;re on the waitlist. Try again — a spot may have opened.</p> : <p className="mb-3 text-sm text-stone-600">First eligible workers to accept get a temporary reservation. Final choice is the client&apos;s.</p>}
          <div className="flex flex-wrap gap-2">
            <ActionButton action={acceptRequestAction.bind(null, jobId)} pendingText="Reserving…">ACCEPT REQUEST</ActionButton>
            <ActionButton variant="secondary" action={rejectRequestAction.bind(null, jobId)}>REJECT</ActionButton>
          </div>
        </div>
      </Card>
    );
  }
  if (matchStatus === "REJECTED") return <Card className="p-5 text-sm text-stone-600">You declined this request.</Card>;
  return (
    <Card className="p-5">
      <p className="font-semibold">Interested in this work?</p>
      <p className="mt-1 text-sm text-stone-600">We&apos;ll check your skills, location and availability against the job.</p>
      <div className="mt-4"><ActionButton action={expressInterestAction.bind(null, jobId)} pendingText="Checking match…">Check if I qualify</ActionButton></div>
    </Card>
  );
}
