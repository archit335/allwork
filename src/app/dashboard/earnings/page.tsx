import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Alert, Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Earnings & payments" };

export default async function EarningsPage() {
  const user = await requireUser("/dashboard/earnings");
  const [earned, spent] = await Promise.all([
    db.payment.findMany({ where: { booking: { workerId: user.id } }, include: { booking: { include: { job: { select: { title: true } } } } }, orderBy: { createdAt: "desc" } }),
    db.payment.findMany({ where: { booking: { clientId: user.id } }, include: { booking: { include: { job: { select: { title: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const paid = earned.filter((p) => p.status === "PAID");
  const total = paid.reduce((a, p) => a + p.workerEarning, 0);
  const fees = paid.reduce((a, p) => a + p.commission, 0);
  const spentTotal = spent.filter((p) => p.status === "PAID").reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings & payments" subtitle="What you've earned as a worker and paid as a client." />
      <Alert tone="amber"><strong>Test mode:</strong> no payment gateway is connected yet, so no real money moves. Payments are recorded to demonstrate commission, earnings and refunds.</Alert>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="lime" label="Total earned" value={formatINR(total)} />
        <Stat tone="violet" label="Jobs paid" value={paid.length} />
        <Stat tone="pink" label="Platform fees" value={formatINR(fees)} />
        <Stat tone="ink" label="Spent hiring" value={formatINR(spentTotal)} />
      </div>
      <PaymentTable title="Received (as worker)" rows={earned.map((p) => ({ id: p.id, bookingId: p.bookingId, title: p.booking.job.title, date: p.createdAt, amount: p.workerEarning, sub: `of ${formatINR(p.amount)} · fee ${formatINR(p.commission)}`, status: p.status }))} />
      <PaymentTable title="Paid (as client)" rows={spent.map((p) => ({ id: p.id, bookingId: p.bookingId, title: p.booking.job.title, date: p.createdAt, amount: p.amount, sub: "", status: p.status }))} />
    </div>
  );
}

function PaymentTable({ title, rows }: { title: string; rows: { id: string; bookingId: string; title: string; date: Date; amount: number; sub: string; status: string }[] }) {
  return (
    <section>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length ? (
        <Card className="divide-y divide-stone-100">
          {rows.map((r) => (
            <Link key={r.id} href={`/bookings/${r.bookingId}`} className="flex items-center justify-between gap-3 p-4 hover:bg-stone-50">
              <div className="min-w-0"><p className="truncate font-medium">{r.title}</p><p className="text-xs text-stone-500">{formatDate(r.date)} {r.sub}</p></div>
              <div className="text-right"><p className="font-semibold">{formatINR(r.amount)}</p><Badge tone={r.status === "PAID" ? "emerald" : r.status === "REFUNDED" ? "sky" : "slate"}>{r.status.toLowerCase()}</Badge></div>
            </Link>
          ))}
        </Card>
      ) : <EmptyState title="Nothing here yet" />}
    </section>
  );
}
