import { getCurrentUser } from "@/lib/auth";
import { AI_LIVE } from "@/lib/ai/extract";
import { PostWork } from "@/components/forms/post-work";

export const metadata = { title: "Post Any Work" };

export default async function PostPage({ searchParams }: PageProps<"/post">) {
  const user = await getCurrentUser();
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-accent-600">Post Any Work</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">What do you need done today?</h1>
      <p className="mb-8 mt-2 max-w-2xl text-stone-600">One small task or a hundred workers — describe it and our assistant turns it into a clear job. Matching workers nearby are notified the moment you publish.</p>
      <PostWork initialQuery={typeof q === "string" ? q : ""} loggedIn={!!user} aiLive={AI_LIVE} />
    </div>
  );
}
