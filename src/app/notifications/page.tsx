import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { markNotificationsReadAction } from "@/app/actions/profile";
import { Card, EmptyState, PageHeader, Button } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const notes = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = notes.some((n) => !n.readAt);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="Notifications" subtitle="Work requests, proposals, bookings and messages — updated live." action={unread ? <form action={markNotificationsReadAction}><Button variant="secondary" size="sm">Mark all read</Button></form> : null} />
      {notes.length ? (
        <Card className="divide-y divide-stone-100">
          {notes.map((n) => (
            <Link key={n.id} href={n.link ?? "#"} className={cn("flex gap-3 p-4 hover:bg-stone-50", !n.readAt && "bg-brand-50/50")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent-500")} aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-stone-600">{n.body}</p>
                <p className="mt-0.5 text-xs text-stone-400">{timeAgo(n.createdAt)}</p>
              </div>
            </Link>
          ))}
        </Card>
      ) : <EmptyState title="You're all caught up" />}
    </div>
  );
}
