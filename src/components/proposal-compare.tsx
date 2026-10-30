"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Star, MapPin, Clock, ShieldCheck, Briefcase } from "lucide-react";
import { ActionButton } from "./action-button";
import { Avatar, Badge, Select } from "./ui";
import { formatINR } from "@/lib/utils";

export type CompareItem = {
  proposalId: string;
  workerId: string;
  name: string;
  avatarUrl: string | null;
  skill: string;
  experienceYears: number;
  total: number;
  pricing: string;
  date: string; // ISO
  dateLabel: string;
  window: string;
  rating: number;
  ratingCount: number;
  reliability: number;
  distanceKm: number | null;
  completedJobs: number;
  verified: boolean;
  note: string | null;
  status: string;
  startSort: number;
};

const SORTS = {
  price: { label: "Lowest price", fn: (a: CompareItem, b: CompareItem) => a.total - b.total },
  rating: { label: "Highest rating", fn: (a: CompareItem, b: CompareItem) => b.rating - a.rating || b.ratingCount - a.ratingCount },
  distance: { label: "Nearest location", fn: (a: CompareItem, b: CompareItem) => (a.distanceKm ?? 9e9) - (b.distanceKm ?? 9e9) },
  earliest: { label: "Earliest availability", fn: (a: CompareItem, b: CompareItem) => a.startSort - b.startSort },
  experience: { label: "Most experienced", fn: (a: CompareItem, b: CompareItem) => b.experienceYears - a.experienceYears },
  reliable: { label: "Most reliable", fn: (a: CompareItem, b: CompareItem) => b.reliability - a.reliability },
} as const;

export function ProposalCompare({
  items, select, decline, canSelect,
}: {
  items: CompareItem[];
  select: (proposalId: string) => Promise<{ error?: string; ok?: string } | undefined>;
  decline: (proposalId: string) => Promise<{ error?: string; ok?: string } | undefined>;
  canSelect: boolean;
}) {
  const [sort, setSort] = useState<keyof typeof SORTS>("price");
  const sorted = useMemo(() => [...items].sort(SORTS[sort].fn), [items, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">{items.length} proposal{items.length === 1 ? "" : "s"} to compare</p>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-stone-600">
          Sort by
          <Select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className="h-9 w-auto">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((p, i) => (
          <div key={p.proposalId} className={`flex flex-col rounded-2xl border bg-surface p-5 ${i === 0 ? "border-brand-400 ring-2 ring-brand-100" : "border-stone-200"}`}>
            {i === 0 && items.length > 1 ? <Badge tone="brand" className="mb-3 self-start">Top · {SORTS[sort].label.toLowerCase()}</Badge> : null}
            <Link href={`/workers/${p.workerId}`} className="flex min-w-0 items-center gap-3">
              <Avatar name={p.name} src={p.avatarUrl} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink hover:text-brand-700">{p.name}</p>
                <p className="truncate text-xs text-stone-500">{p.skill}</p>
              </div>
            </Link>
            <p className="mt-4 font-display text-2xl font-bold text-ink">{formatINR(p.total)}</p>
            <p className="text-xs text-stone-500">{p.pricing}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
              <li className="flex items-center gap-2"><Briefcase className="size-4 text-stone-400" />{p.experienceYears} yrs experience · {p.completedJobs} jobs done</li>
              <li className="flex items-center gap-2"><Clock className="size-4 text-stone-400" />{p.dateLabel}, {p.window}</li>
              <li className="flex items-center gap-2"><Star className="size-4 text-amber-500" />{p.ratingCount ? `${p.rating.toFixed(1)} (${p.ratingCount})` : "New — no ratings yet"}</li>
              <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-stone-400" />Reliability {Math.round(p.reliability)}/100{p.verified ? " · Verified" : ""}</li>
              {p.distanceKm != null ? <li className="flex items-center gap-2"><MapPin className="size-4 text-stone-400" />{p.distanceKm} km away</li> : null}
            </ul>
            {p.note ? <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm italic text-stone-600">“{p.note}”</p> : null}
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {p.status === "SUBMITTED" && canSelect ? (
                <>
                  <ActionButton action={() => select(p.proposalId)} pendingText="Booking…" confirm={`Hire ${p.name} for ${formatINR(p.total)}?`}>Select & book</ActionButton>
                  <ActionButton variant="ghost" action={() => decline(p.proposalId)} pendingText="…" confirm="Decline this proposal? The position will reopen for others.">Decline</ActionButton>
                </>
              ) : (
                <Badge tone={p.status === "ACCEPTED" ? "emerald" : "slate"}>{p.status === "ACCEPTED" ? "Hired" : p.status.toLowerCase()}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
