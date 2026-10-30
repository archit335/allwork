"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";
import type { ComponentProps } from "react";

type Result = { error?: string; ok?: string } | undefined | void;

/** Runs a bound server action and shows its result inline. */
export function ActionButton({
  action, children, confirm, pendingText, showOk = true, ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "action"> & { action: () => Promise<Result>; confirm?: string; pendingText?: string; showOk?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        {...props}
        disabled={pending || props.disabled}
        aria-busy={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            setMsg(r ?? null);
            router.refresh();
          });
        }}
      >
        {pending ? (pendingText ?? "Working…") : children}
      </Button>
      {msg?.error ? <span role="alert" className="text-xs text-red-600">{msg.error}</span> : null}
      {showOk && msg?.ok && msg.ok !== "Done" ? <span role="status" className="text-xs text-emerald-700">{msg.ok}</span> : null}
    </span>
  );
}
