import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { splitPayment } from "@/lib/allocation";
import { startBookingAction, workerDoneAction, confirmAndPayAction } from "@/app/actions/bookings";
import { ActionButton } from "@/components/action-button";
import { ChatBox, ReviewForm, CancelBooking, DisputeForm, ReportForm } from "@/components/forms/booking-forms";
import { Alert, Avatar, Badge, Card, type Tone } from "@/components/ui";
import { cn, formatDateTime, formatINR } from "@/lib/utils";

export const metadata = { title: "Booking" };
const TONE: Record<string, Tone> = { CONFIRMED: "brand", IN_PROGRESS: "sky", COMPLETED: "emerald", CANCELLED: "red" };

export default async function BookingPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/bookings/${id}`);
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      job: true, proposal: true, payments: { orderBy: { createdAt: "desc" } }, reviews: true, disputes: true,
      worker: { select: { id: true, name: true, avatarUrl: true, phone: true } },
      client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
      conversation: { include: { messages: { orderBy: { createdAt: "asc" }, take: 200, include: { sender: { select: { name: true } } } } } },
    },
  });
  if (!b || (b.clientId !== user.id && b.workerId !== user.id)) notFound();
  const asWorker = b.workerId === user.id;
  const other = asWorker ? b.client : b.worker;
  const myReview = b.reviews.find((r) => r.authorId === user.id);
  const fee = splitPayment(b.amount);
  const active = ["CONFIRMED", "IN_PROGRESS"].includes(b.status);

  const steps = [
    { label: "Booked", done: true },
    { label: "Work started", done: b.status !== "CONFIRMED" && b.status !== "CANCELLED" },
    { label: "Worker marked done", done: !!b.workerDoneAt || b.status === "COMPLETED" },
    { label: "Client confirmed & paid", done: b.status === "COMPLETED" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {sp.new ? <div className="mb-6"><Alert tone="emerald"><strong>Booking confirmed!</strong> The worker&apos;s calendar is now blocked for this slot. Use the chat below to confirm details.</Alert></div> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={TONE[b.status]}>{b.status.replace("_", " ").toLowerCase()}</Badge><span className="text-sm text-stone-500">You are the {asWorker ? "worker" : "client"}</span></div>
            <Link href={`/jobs/${b.jobId}`} className="mt-3 block font-display text-2xl font-bold hover:text-brand-700">{b.job.title}</Link>
            <p className="mt-1 text-stone-600">{formatDateTime(b.start)} – {b.end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · {b.job.isRemote ? "Remote" : [b.job.address, b.job.city].filter(Boolean).join(", ")}</p>
            {b.cancelReason ? <p className="mt-3 text-sm text-red-700">Cancelled by {b.cancelledBy?.toLowerCase()}: {b.cancelReason}</p> : null}
            <ol className="mt-6 grid gap-3 sm:grid-cols-4">
              {steps.map((s) => (
                <li key={s.label} className={cn("flex items-center gap-2 text-sm", s.done ? "text-brand-800" : "text-stone-400")}>
                  {s.done ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}{s.label}
                </li>
              ))}
            </ol>
            {active ? (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-5">
                {asWorker && b.status === "CONFIRMED" ? <ActionButton action={startBookingAction.bind(null, b.id)}>Start work</ActionButton> : null}
                {asWorker && !b.workerDoneAt ? <ActionButton variant="secondary" action={workerDoneAction.bind(null, b.id)}>Mark work done</ActionButton> : null}
                {!asWorker ? <ActionButton variant="accent" action={confirmAndPayAction.bind(null, b.id)} confirm={`Confirm the work is complete and pay ${formatINR(b.amount)} (test mode)?`}>Confirm completion & pay {formatINR(b.amount)}</ActionButton> : null}
                <CancelBooking bookingId={b.id} />
              </div>
            ) : null}
          </Card>

          <Card id="chat" className="scroll-mt-24 overflow-hidden">
            <div className="border-b border-stone-100 px-5 py-3 font-semibold">Chat with {other.name}</div>
            <div className="flex max-h-[420px] min-h-48 flex-col gap-2 overflow-y-auto p-4">
              {b.conversation?.messages.length ? b.conversation.messages.map((m) => {
                const mine = m.senderId === user.id;
                return (
                  <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", mine ? "self-end bg-brand-700 text-white" : "self-start bg-stone-100 text-ink")}>
                    <p className="whitespace-pre-line">{m.body}</p>
                    {m.attachmentUrl ? <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block truncate text-xs underline">{m.attachmentUrl}</a> : null}
                    <p className={cn("mt-0.5 text-[10px]", mine ? "text-white/70" : "text-stone-400")}>{formatDateTime(m.createdAt)}</p>
                  </div>
                );
              }) : <p className="m-auto text-sm text-stone-400">No messages yet. Say hello 👋</p>}
            </div>
            {b.status !== "CANCELLED" ? <ChatBox bookingId={b.id} /> : null}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={other.name} src={other.avatarUrl} size={44} />
              <div>
                <p className="font-semibold">{other.name}</p>
                <p className="text-xs text-stone-500">{asWorker ? "Client" : "Worker"}{active ? ` · ${other.phone}` : ""}</p>
              </div>
            </div>
            {!asWorker ? <Link href={`/workers/${other.id}`} className="mt-3 block text-sm font-semibold text-brand-700">View profile →</Link> : null}
          </Card>
          <Card className="p-5">
            <p className="font-semibold">Payment</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-stone-500">Agreed amount</dt><dd className="font-semibold">{formatINR(b.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">Platform fee ({fee.pct}%)</dt><dd>{formatINR(fee.commission)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">Worker receives</dt><dd>{formatINR(fee.workerEarning)}</dd></div>
            </dl>
            {b.payments.map((p) => <p key={p.id} className="mt-3 text-xs text-stone-500">{p.status} · {p.provider} · {p.providerRef}</p>)}
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Test mode — no real money is charged.</p>
          </Card>
          {b.status === "COMPLETED" ? (
            <Card className="p-5">{myReview ? <p className="text-sm">You rated this {myReview.rating}★. Thanks!</p> : <ReviewForm bookingId={b.id} targetName={other.name} />}</Card>
          ) : null}
          <Card className="space-y-3 p-5">
            {b.disputes.map((d) => <p key={d.id} className="text-sm"><Badge tone="orange">dispute · {d.status.toLowerCase()}</Badge> {d.reason}</p>)}
            <DisputeForm bookingId={b.id} />
            <ReportForm targetId={other.id} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
