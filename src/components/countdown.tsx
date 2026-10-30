"use client";
import { useEffect, useState } from "react";

export function Countdown({ to, className }: { to: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock must start on the client to avoid hydration mismatch
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return <span className={className}>…</span>;
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className={className}>expired</span>;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return <span className={className} suppressHydrationWarning>{m}:{String(s).padStart(2, "0")}</span>;
}
