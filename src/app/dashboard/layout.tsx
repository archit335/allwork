import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const requests = await db.jobMatch.count({ where: { workerId: user.id, status: "SENT", job: { status: "OPEN" } } });
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:py-10">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <DashboardNav counts={{ requests }} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
