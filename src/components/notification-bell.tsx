"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type Toast = { id: string; title: string; body: string; link: string | null };

/** Live unread count + toast for new notifications via Server-Sent Events. */
export function NotificationBell({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const [toast, setToast] = useState<Toast | null>(null);
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("unread", (e) => setCount(Number((e as MessageEvent).data)));
    es.addEventListener("notification", (e) => {
      const n = JSON.parse((e as MessageEvent).data) as Toast;
      setToast(n);
      router.refresh();
      setTimeout(() => setToast((t) => (t?.id === n.id ? null : t)), 7000);
    });
    return () => es.close();
  }, [router]);

  return (
    <>
      <Link href="/notifications" className="relative grid size-10 place-items-center rounded-lg text-stone-700 hover:bg-stone-100" aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold leading-4 text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
      {toast ? (
        <div role="alert" className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-brand-200 bg-surface p-4 shadow-xl">
          <p className="text-sm font-bold text-brand-800">{toast.title}</p>
          <p className="mt-1 text-sm text-stone-600">{toast.body}</p>
          <div className="mt-3 flex gap-2">
            {toast.link ? (
              <Link href={toast.link} onClick={() => setToast(null)} className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white">Open</Link>
            ) : null}
            <button onClick={() => setToast(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100">Dismiss</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
