import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ProjectForm } from "@/components/forms/project-forms";

export const metadata = { title: "Publish a project" };

export default async function NewProjectPage() {
  await requireUser("/projects/new");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Collaborate</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Publish your project</h1>
      <p className="mb-8 mt-2 text-stone-600">Tell people what you&apos;re building and who you need. Be honest about compensation — it builds trust and better teams.</p>
      <Card className="p-5 sm:p-7"><ProjectForm /></Card>
    </div>
  );
}
