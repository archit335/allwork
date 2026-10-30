import Link from "next/link";
import { X } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeBlockAction, removeWeeklySlotAction } from "@/app/actions/profile";
import { BlockForm, WeeklySlotForm } from "@/components/forms/calendar-forms";
import { Card, PageHeader } from "@/components/ui";
import { cn, minToHHMM } from "@/lib/utils";

export const metadata = { title: "Availability calendar" };
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function CalendarPage() {
  const user = await requireUser("/dashboard/calendar");
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 14);
  const [slots, blocks] = await Promise.all([
    db.availabilitySlot.findMany({ where: { userId: user.id }, orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }] }),
    db.calendarBlock.findMany({ where: { userId: user.id, end: { gt: start }, start: { lt: end } }, include: { booking: { select: { id: true } } }, orderBy: { start: "asc" } }),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const todayIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Availability calendar" subtitle="Confirmed bookings block your time automatically, so you can never be double-booked." />

      <Card className="overflow-x-auto p-4">
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {days.map((d) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === d.getDay());
            const dayBlocks = blocks.filter((b) => b.start < new Date(d.getTime() + 86400000) && b.end > d);
            const isToday = d.getTime() === start.getTime();
            return (
              <div key={d.toISOString()} className={cn("min-h-36 rounded-xl border p-2", isToday ? "border-brand-400 bg-brand-50/50" : "border-stone-200")}>
                <p className="text-xs font-semibold text-stone-500">{DAY[d.getDay()]} <span className="text-ink">{d.getDate()}</span></p>
                <div className="mt-1.5 space-y-1">
                  {daySlots.map((s) => <p key={s.id} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">{minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}</p>)}
                  {dayBlocks.map((b) => {
                    const cls = b.type === "BOOKING" ? "bg-brand-700 text-white" : b.type === "BUSY" ? "bg-ink text-white ring-1 ring-stone-300" : "bg-amber-100 text-amber-900";
                    const label = `${hm(b.start)}–${hm(b.end)} ${b.type === "BOOKING" ? "Booked" : b.type === "BUSY" ? "Busy" : "Extra"}`;
                    return b.booking ? (
                      <Link key={b.id} href={`/bookings/${b.booking.id}`} className={cn("block truncate rounded-md px-1.5 py-0.5 text-[11px]", cls)} title={b.note ?? ""}>{label}</Link>
                    ) : <p key={b.id} className={cn("truncate rounded-md px-1.5 py-0.5 text-[11px]", cls)} title={b.note ?? ""}>{label}</p>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-600">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-100" />Weekly hours</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-brand-700" />Confirmed booking</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-ink ring-1 ring-stone-300" />Busy</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-amber-100" />Temporary availability</span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Weekly working hours</h2>
          <p className="mb-4 text-sm text-stone-600">Your regular availability. Used to rank you for jobs at those times.</p>
          <WeeklySlotForm />
          <ul className="mt-4 divide-y divide-stone-100">
            {slots.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span>{DAY[s.dayOfWeek]} · {minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}</span>
                <form action={removeWeeklySlotAction.bind(null, s.id)}><button className="grid size-7 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-red-600" aria-label="Remove"><X className="size-4" /></button></form>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Busy slots & temporary availability</h2>
          <p className="mb-4 text-sm text-stone-600">Block time you can&apos;t work, or open extra hours for urgent jobs.</p>
          <BlockForm today={todayIso} />
          <ul className="mt-4 divide-y divide-stone-100">
            {blocks.filter((b) => b.type !== "BOOKING").map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <span>{b.type === "BUSY" ? "Busy" : "Extra"} · {b.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} {hm(b.start)}–{hm(b.end)}{b.note ? ` · ${b.note}` : ""}</span>
                <form action={removeBlockAction.bind(null, b.id)}><button className="grid size-7 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-red-600" aria-label="Remove"><X className="size-4" /></button></form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
