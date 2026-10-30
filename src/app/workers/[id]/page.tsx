import { notFound } from "next/navigation";
import { BadgeCheck, Briefcase, Globe, Languages, MapPin, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toggleSaveWorkerAction } from "@/app/actions/profile";
import { ActionButton } from "@/components/action-button";
import { ReportForm } from "@/components/forms/booking-forms";
import { Avatar, Badge, Card, LinkButton, Stat } from "@/components/ui";
import { WORK_TYPE_LABEL, formatDate, formatINR } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/workers/[id]">) {
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, select: { name: true } });
  return { title: u?.name ?? "Worker" };
}

export default async function WorkerProfilePage({ params }: PageProps<"/workers/[id]">) {
  const { id } = await params;
  const [me, w] = await Promise.all([
    getCurrentUser(),
    db.user.findUnique({
      where: { id },
      include: {
        workerProfile: true,
        skills: { include: { skill: true }, orderBy: { years: "desc" } },
        reviewsReceived: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
        verifications: { where: { status: "APPROVED" } },
      },
    }),
  ]);
  if (!w || !w.workerProfile) notFound();
  const p = w.workerProfile;
  const saved = me ? !!(await db.savedWorker.findUnique({ where: { userId_workerId: { userId: me.id, workerId: id } } })) : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={w.name} src={w.avatarUrl} size={80} />
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-2 font-display text-2xl font-bold">{w.name}{w.idVerified ? <BadgeCheck className="size-6 text-brand-600" aria-label="ID verified" /> : null}</h1>
                <p className="text-stone-600">{p.headline ?? w.skills.map((s) => s.skill.name).slice(0, 3).join(" · ")}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-stone-500"><MapPin className="size-4" />{[w.area, w.city].filter(Boolean).join(", ")} · works within {p.workRadiusKm} km{p.remoteOk ? " · remote OK" : ""}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.isAvailable ? <Badge tone="emerald">Available for work</Badge> : <Badge>Not available</Badge>}
                  {p.emergencyAvailable ? <Badge tone="orange">Urgent work OK</Badge> : null}
                  {w.phoneVerified ? <Badge tone="brand">Phone verified</Badge> : null}
                  {w.verifications.map((v) => <Badge key={v.id} tone="brand">{v.type.toLowerCase()} verified</Badge>)}
                </div>
              </div>
            </div>
            {w.bio ? <p className="mt-5 whitespace-pre-line text-stone-700">{w.bio}</p> : null}
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Rating" value={p.ratingCount ? `★ ${p.ratingAvg.toFixed(1)}` : "New"} hint={`${p.ratingCount} reviews`} />
            <Stat label="Jobs done" value={p.completedJobs} />
            <Stat label="Reliability" value={`${Math.round(p.reliabilityScore)}`} hint="out of 100" />
            <Stat label="Cancellations" value={p.cancelledJobs} />
          </div>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {w.skills.map((s) => <Badge key={s.skillId} tone="brand">{s.skill.name} · {s.years}y · {s.level.toLowerCase()}</Badge>)}
            </div>
            {p.previousWork ? <><h3 className="mt-6 font-semibold">Previous work</h3><p className="mt-1 whitespace-pre-line text-sm text-stone-700">{p.previousWork}</p></> : null}
            {p.portfolioLinks.length ? (
              <><h3 className="mt-6 font-semibold">Portfolio</h3><ul className="mt-1 space-y-1">{p.portfolioLinks.map((l) => <li key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 text-sm text-brand-700 hover:underline"><Globe className="size-3.5" />{l}</a></li>)}</ul></>
            ) : null}
            {p.certifications.length ? <><h3 className="mt-6 font-semibold">Certifications</h3><p className="mt-1 text-sm text-stone-700">{p.certifications.join(" · ")}</p></> : null}
            {p.education ? <><h3 className="mt-6 font-semibold">Education</h3><p className="mt-1 text-sm text-stone-700">{p.education}</p></> : null}
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold">Reviews</h2>
            {w.reviewsReceived.length ? (
              <ul className="mt-3 divide-y divide-stone-100">
                {w.reviewsReceived.map((r) => (
                  <li key={r.id} className="py-3">
                    <p className="flex items-center gap-1 text-sm font-semibold">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-4 fill-amber-400 text-amber-400" />)}<span className="ml-2 text-stone-500">{r.author.name} · {formatDate(r.createdAt)}</span></p>
                    {r.comment ? <p className="mt-1 text-sm text-stone-700">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-stone-500">No reviews yet.</p>}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3 p-5">
            <p className="font-semibold">Rates</p>
            <p className="text-sm text-stone-700">{p.hourlyRate ? `${formatINR(p.hourlyRate)}/hour` : null}{p.hourlyRate && p.dailyRate ? " · " : ""}{p.dailyRate ? `${formatINR(p.dailyRate)}/day` : null}{!p.hourlyRate && !p.dailyRate ? "Quotes per job" : ""}</p>
            {p.expectedComp ? <p className="text-sm text-stone-600">Full-time: {p.expectedComp}</p> : null}
            {p.workTypes.length ? <div className="flex flex-wrap gap-1">{p.workTypes.map((t) => <Badge key={t}>{WORK_TYPE_LABEL[t]}</Badge>)}</div> : null}
            {p.languages.length ? <p className="flex items-center gap-1.5 text-sm text-stone-600"><Languages className="size-4" />{p.languages.join(", ")}</p> : null}
            <p className="flex items-center gap-1.5 text-sm text-stone-600"><Briefcase className="size-4" />{p.experienceYears} years experience</p>
          </Card>
          {me && me.id !== w.id ? (
            <Card className="space-y-3 p-5">
              <LinkButton href={`/post?q=${encodeURIComponent(`I need a ${w.skills[0]?.skill.name ?? "worker"}${w.city ? ` in ${w.city}` : ""}`)}`} variant="accent" className="w-full">Post work for this skill</LinkButton>
              <ActionButton variant="secondary" className="w-full" action={toggleSaveWorkerAction.bind(null, w.id)}>{saved ? "★ Saved — remove" : "☆ Save worker"}</ActionButton>
              <p className="text-xs text-stone-500">Contact details are shared once a booking is confirmed — keeping both sides safe.</p>
              <ReportForm targetId={w.id} />
            </Card>
          ) : !me ? (
            <Card className="p-5"><LinkButton href={`/login?next=/workers/${w.id}`} className="w-full">Log in to hire</LinkButton></Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
