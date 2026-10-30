"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UserRound, Inbox, FileText, CalendarDays, Wallet, Megaphone, Briefcase, Handshake, Bookmark, Rocket, Bell, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUPS = [
  { title: "", dot: "", items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/notifications", label: "Notifications", icon: Bell }] },
  {
    title: "Worker",
    dot: "bg-zap-400",
    items: [
      { href: "/dashboard/profile", label: "Profile & skills", icon: UserRound },
      { href: "/dashboard/requests", label: "Work requests", icon: Inbox, badge: "requests" },
      { href: "/dashboard/proposals", label: "My proposals", icon: FileText },
      { href: "/dashboard/calendar", label: "Availability calendar", icon: CalendarDays },
      { href: "/dashboard/earnings", label: "Earnings", icon: Wallet },
    ],
  },
  {
    title: "Client",
    dot: "bg-accent-500",
    items: [
      { href: "/post", label: "Post any work", icon: Megaphone },
      { href: "/dashboard/jobs", label: "My jobs", icon: Briefcase },
      { href: "/talent", label: "Find talent", icon: Search },
      { href: "/dashboard/saved", label: "Saved workers", icon: Bookmark },
    ],
  },
  { title: "Both", dot: "bg-sky-400", items: [{ href: "/dashboard/bookings", label: "Bookings & messages", icon: Handshake }] },
  { title: "Collaborate", dot: "bg-brand-400", items: [{ href: "/dashboard/projects", label: "Projects & applications", icon: Rocket }] },
];

export function DashboardNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="relative overflow-hidden rounded-3xl bg-ink p-2 text-white lg:p-3">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 hidden size-48 rounded-full bg-brand-600/50 blur-3xl lg:block" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 hidden size-48 rounded-full bg-accent-500/40 blur-3xl lg:block" />
      <div className="relative flex gap-1 overflow-x-auto lg:flex-col lg:gap-5 lg:overflow-visible">
        {GROUPS.map((g) => (
          <div key={g.title || "main"} className="flex gap-1 lg:flex-col">
            {g.title ? (
              <p className="hidden items-center gap-2 px-3 pb-1 text-[11px] font-extrabold uppercase tracking-widest text-white/50 lg:flex">
                <span className={cn("size-2 rounded-full", g.dot)} />{g.title}
              </p>
            ) : null}
            {g.items.map((i) => {
              const active = path === i.href;
              const badge = "badge" in i && i.badge ? counts[i.badge] : 0;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                    active ? "bg-zap-400 text-ink shadow-lg shadow-zap-400/20" : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <i.icon className="size-4" />
                  {i.label}
                  {badge ? <span className={cn("ml-auto rounded-full px-2 text-xs font-extrabold", active ? "bg-ink text-zap-300" : "bg-accent-500 text-white")}>{badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
