import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms/auth-forms";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mb-6 mt-2 text-stone-600">Log in to continue.</p>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </>
  );
}
