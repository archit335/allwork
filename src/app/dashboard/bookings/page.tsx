import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, Badge, Card, EmptyState, PageHeader, type Tone } from "@/components/ui";
import { formatDateTime, formatINR } from "@/lib/utils";

export const metadata = { title: "Bookings" };
const TONE: Record<string, Tone> = { CONFIRMED: "brand", IN_PROGRESS: "sky", COMPLETED: "emerald", CANCELLED: "red" };

export default async function BookingsPage() {
  const user = await requireUser("/dashboard/bookings");
  const bookings = await db.booking.findMany({
    where: { OR: [{ workerId: user.id }, { clientId: user.id }] },
    include: { job: { select: { title: true } }, worker: { select: { name: true, avatarUrl: true } }, client: { select: { name: true, avatarUrl: true } }, conversation: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    orderBy: { start: "desc" },
  });
  return (
    <div>
      <PageHeader title="Bookings & messages" subtitle="Everything you're working on or have hired for." />
      {bookings.length ? (
        <Card className="divide-y divide-stone-100">
          {bookings.map((b) => {
            const asWorker = b.workerId === user.id;
            const other = asWorker ? b.client : b.worker;
            const last = b.conversation?.messages[0];
            return (
              <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center gap-3 p-4 hover:bg-stone-50">
                <Avatar name={other.name} src={other.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.job.title}</p>
                  <p className="truncate text-sm text-stone-500">{asWorker ? "Client" : "Worker"}: {other.name} · {formatDateTime(b.start)}{last ? ` · “${last.body.slice(0, 40)}”` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatINR(b.amount)}</p>
                  <Badge tone={TONE[b.status]}>{b.status.replace("_", " ").toLowerCase()}</Badge>
                </div>
              </Link>
            );
          })}
        </Card>
      ) : <EmptyState title="No bookings yet" body="When a client selects your proposal — or you hire someone — the booking shows up here with a chat." />}
    </div>
  );
}
