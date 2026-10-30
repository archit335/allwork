import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our custom colour scales so later classes reliably override earlier ones.
const twMerge = extendTailwindMerge({
  extend: { theme: { color: ["brand", "accent", "zap", "ink", "bg", "surface", "fg"].flatMap((c) => [c, ...["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].map((s) => `${c}-${s}`)]) } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatINR(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "Flexible";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

export function timeAgo(d: Date | string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** "14:30" -> minutes from midnight */
export function hhmmToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Combine a date (any time) with an "HH:MM" string. */
export function atTime(date: Date, hhmm: string) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(hhmmToMin(hhmm));
  return d;
}

export const WORK_TYPE_LABEL: Record<string, string> = {
  ONE_TIME: "One-time",
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  PROJECT: "Project-based",
  PART_TIME: "Part-time",
  FULL_TIME: "Full-time",
  PERMANENT: "Permanent",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
};

export const COLLAB_LABEL: Record<string, { label: string; paid: boolean; tone: string }> = {
  PAID: { label: "Paid Collaboration", paid: true, tone: "emerald" },
  UNPAID_VOLUNTARY: { label: "Unpaid · Voluntary", paid: false, tone: "amber" },
  REVENUE_SHARE: { label: "Revenue Sharing", paid: false, tone: "sky" },
  EQUITY: { label: "Equity-Based", paid: false, tone: "violet" },
  OPEN_SOURCE: { label: "Open Source", paid: false, tone: "slate" },
  LEARNING: { label: "Learning-Based", paid: false, tone: "rose" },
};
