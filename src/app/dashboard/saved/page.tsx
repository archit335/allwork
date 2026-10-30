import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

export const metadata = { title: "Saved workers" };

export default async function SavedPage() {
  const user = await requireUser("/dashboard/saved");
  const saved = await db.savedWorker.findMany({
    where: { userId: user.id },
    include: { worker: { include: { workerProfile: true, skills: { include: { skill: true }, take: 3 } } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader title="Saved workers" subtitle="Your shortlist of people you'd like to hire." />
      {saved.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {saved.map(({ worker: w }) => (
            <Link key={w.id} href={`/workers/${w.id}`}>
              <Card className="flex items-center gap-3 p-4 hover:border-brand-300">
                <Avatar name={w.name} src={w.avatarUrl} size={44} />
                <div className="min-w-0">
                  <p className="font-semibold">{w.name}</p>
                  <p className="truncate text-sm text-stone-500">{w.skills.map((s) => s.skill.name).join(", ") || w.workerProfile?.headline}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="No saved workers" body="Tap “Save” on a worker's profile to shortlist them." action={<LinkButton href="/talent">Find talent</LinkButton>} />}
    </div>
  );
}
