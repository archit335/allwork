import Link from "next/link";
import { BadgeCheck, MapPin, Search, Star } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { haversineKm, resolveCity, CITY_NAMES } from "@/lib/geo";
import { Avatar, Badge, Button, Card, EmptyState, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { WORK_TYPE_LABEL, formatINR } from "@/lib/utils";

export const metadata = { title: "Hire Talent" };

const SORTS = { relevance: "Most reliable", rating: "Highest rating", experience: "Most experienced", price: "Lowest daily rate", nearest: "Nearest" } as const;

export default async function TalentPage({ searchParams }: PageProps<"/talent">) {
  const sp = await searchParams;
  const skill = typeof sp.skill === "string" ? sp.skill.trim() : "";
  const city = typeof sp.city === "string" ? sp.city.trim() : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const verified = sp.verified === "1";
  const sort = (typeof sp.sort === "string" && sp.sort in SORTS ? sp.sort : "relevance") as keyof typeof SORTS;
  const me = await getCurrentUser();

  const where: Prisma.UserWhereInput = {
    workerProfile: { isAvailable: true, ...(type && type in WORK_TYPE_LABEL ? { workTypes: { has: type as never } } : {}) },
    skills: { some: {} },
    ...(skill ? { OR: [{ skills: { some: { skill: { name: { contains: skill, mode: "insensitive" } } } } }, { workerProfile: { headline: { contains: skill, mode: "insensitive" } } }] } : {}),
    ...(city ? { OR: [{ city: { equals: city, mode: "insensitive" } }, { workerProfile: { preferredLocations: { has: city } } }] } : {}),
    ...(verified ? { idVerified: true } : {}),
    ...(me ? { NOT: { id: me.id } } : {}),
  };
  if (skill && city) {
    // both filters use OR — combine with AND
    delete where.OR;
    where.AND = [
      { OR: [{ skills: { some: { skill: { name: { contains: skill, mode: "insensitive" } } } } }, { workerProfile: { headline: { contains: skill, mode: "insensitive" } } }] },
      { OR: [{ city: { equals: city, mode: "insensitive" } }, { workerProfile: { preferredLocations: { has: city } } }] },
    ];
  }
  const workers = await db.user.findMany({ where, include: { workerProfile: true, skills: { include: { skill: true }, orderBy: { years: "desc" } } }, take: 100 });
  const origin = resolveCity(city) ?? (me?.lat != null && me.lng != null ? { lat: me.lat, lng: me.lng } : null);
  const rows = workers.map((w) => ({ w, km: origin && w.lat != null && w.lng != null ? Math.round(haversineKm(origin, { lat: w.lat, lng: w.lng })) : null }));
  rows.sort((a, b) => {
    const pa = a.w.workerProfile!, pb = b.w.workerProfile!;
    switch (sort) {
      case "rating": return pb.ratingAvg - pa.ratingAvg || pb.ratingCount - pa.ratingCount;
      case "experience": return pb.experienceYears - pa.experienceYears;
      case "price": return (pa.dailyRate ?? 9e9) - (pb.dailyRate ?? 9e9);
      case "nearest": return (a.km ?? 9e9) - (b.km ?? 9e9);
      default: return pb.reliabilityScore - pa.reliabilityScore;
    }
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Hire Talent" subtitle="Freelancers, part-time and full-time staff, temporary workers, skilled and unskilled labour, interns and consultants." action={<LinkButton href="/post" variant="accent">Post a job instead</LinkButton>} />
      <form className="mb-6 grid gap-2 rounded-2xl border border-stone-200 bg-surface p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
        <Input name="skill" defaultValue={skill} placeholder="Skill — e.g. Plumber, UI/UX, Machine Operator" aria-label="Skill" />
        <Input name="city" defaultValue={city} list="t-cities" placeholder="City" aria-label="City" />
        <datalist id="t-cities">{CITY_NAMES.map((c) => <option key={c} value={c} />)}</datalist>
        <Select name="type" defaultValue={type} aria-label="Hiring for"><option value="">Any engagement</option>{Object.entries(WORK_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="sort" defaultValue={sort} aria-label="Sort">{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label className="flex items-center gap-2 px-2 text-sm"><input type="checkbox" name="verified" value="1" defaultChecked={verified} className="accent-brand-700" />ID verified</label>
        <Button type="submit"><Search className="size-4" />Search</Button>
      </form>
      {rows.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ w, km }) => {
            const p = w.workerProfile!;
            return (
              <Link key={w.id} href={`/workers/${w.id}`} className="group">
                <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <Avatar name={w.name} src={w.avatarUrl} size={48} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 font-semibold">{w.name}{w.idVerified ? <BadgeCheck className="size-4 text-brand-600" aria-label="ID verified" /> : null}</p>
                      <p className="truncate text-sm text-stone-500">{p.headline ?? w.skills[0]?.skill.name}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">{w.skills.slice(0, 4).map((s) => <Badge key={s.skillId}>{s.skill.name}</Badge>)}</div>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-4 text-sm text-stone-600">
                    <span className="flex items-center gap-1"><Star className="size-4 text-amber-500" />{p.ratingCount ? `${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : "New"}</span>
                    <span>{p.experienceYears} yrs exp</span>
                    <span className="flex items-center gap-1"><MapPin className="size-4 text-stone-400" />{w.city}{km != null ? ` · ${km} km` : ""}</span>
                    <span>{p.dailyRate ? `${formatINR(p.dailyRate)}/day` : p.hourlyRate ? `${formatINR(p.hourlyRate)}/hr` : "Rate on request"}</span>
                  </div>
                  <p className="mt-3 text-xs text-stone-500">Reliability {Math.round(p.reliabilityScore)}/100 · {p.completedJobs} jobs completed</p>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : <EmptyState title="No one matches yet" body="Try another skill or city — or post your work and we'll notify matching people as they join." action={<LinkButton href="/post" variant="accent">Post any work</LinkButton>} />}
    </div>
  );
}
