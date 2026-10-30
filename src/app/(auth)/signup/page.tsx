import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/forms/auth-forms";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Join AllWork</h1>
      <p className="mb-6 mt-2 text-stone-600">One account to find work, post work, hire and collaborate.</p>
      <SignupForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}
