"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send, Star } from "lucide-react";
import { sendMessageAction, reviewAction, disputeAction, cancelBookingAction, reportUserAction } from "@/app/actions/bookings";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/form-button";

export function ChatBox({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(sendMessageAction.bind(null, bookingId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [attach, setAttach] = useState(false);
  const router = useRouter();
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  // Poll for new messages while the chat is open.
  useEffect(() => { const t = setInterval(() => router.refresh(), 5000); return () => clearInterval(t); }, [router]);
  return (
    <form ref={ref} action={action} className="space-y-2 border-t border-stone-100 p-3">
      {attach ? <Input name="attachmentUrl" placeholder="Paste a link to an image or document (https://…)" /> : null}
      <div className="flex gap-2">
        <button type="button" onClick={() => setAttach((a) => !a)} className="grid size-10 shrink-0 place-items-center rounded-xl text-stone-500 hover:bg-stone-100" aria-label="Attach a link"><Paperclip className="size-4" /></button>
        <label htmlFor="chat-body" className="sr-only">Message</label>
        <Input id="chat-body" name="body" placeholder="Discuss requirements, confirm details…" autoComplete="off" />
        <SubmitButton aria-label="Send" pendingText="…"><Send className="size-4" /></SubmitButton>
      </div>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}

export function ReviewForm({ bookingId, targetName }: { bookingId: string; targetName: string }) {
  const [state, action] = useActionState(reviewAction.bind(null, bookingId), undefined);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <Alert tone="emerald">{state.ok}</Alert>;
  return (
    <form action={action} className="space-y-3">
      <p className="font-semibold">Rate {targetName}</p>
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)}>
            <Star className={`size-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} />
          </button>
        ))}
      </div>
      <Textarea name="comment" placeholder="How was the work? (optional)" className="min-h-16" />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton disabled={!rating} pendingText="Submitting…">Submit review</SubmitButton>
    </form>
  );
}

export function CancelBooking({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Cancel booking</Button>;
  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-800">Cancellations are recorded in cancellation history and any test payment is refunded.</p>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling" />
      <div className="flex gap-2">
        <Button variant="danger" size="sm" disabled={pending} onClick={() => start(async () => { const r = await cancelBookingAction(bookingId, reason); if (r?.error) setMsg(r.error); else router.refresh(); })}>{pending ? "Cancelling…" : "Confirm cancel"}</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Keep booking</Button>
      </div>
      {msg ? <p className="text-xs text-red-700">{msg}</p> : null}
    </div>
  );
}

export function DisputeForm({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(disputeAction.bind(null, bookingId), undefined);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-stone-600">Raise a dispute</summary>
      <form action={action} className="mt-2 space-y-2">
        <Textarea name="reason" placeholder="What went wrong?" className="min-h-16" />
        <SubmitButton variant="secondary" size="sm" pendingText="…">Submit dispute</SubmitButton>
        {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : state?.ok ? <p className="text-xs text-emerald-700">{state.ok}</p> : null}
      </form>
    </details>
  );
}

export function ReportForm({ targetId }: { targetId: string }) {
  const [state, action] = useActionState(reportUserAction.bind(null, targetId), undefined);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-stone-500">Report user</summary>
      <form action={action} className="mt-2 space-y-2">
        <Textarea name="reason" placeholder="Describe the problem" className="min-h-16" />
        <SubmitButton variant="secondary" size="sm" pendingText="…">Send report</SubmitButton>
        {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : state?.ok ? <p className="text-xs text-emerald-700">{state.ok}</p> : null}
      </form>
    </details>
  );
}
