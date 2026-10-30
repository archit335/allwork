import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "outline" | "zap";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm shadow-brand-900/10",
  accent: "bg-accent-600 text-white hover:bg-accent-500 shadow-md shadow-accent-500/30",
  secondary: "bg-surface text-ink border border-stone-200 hover:border-stone-300 hover:bg-stone-50",
  outline: "border border-brand-700 text-brand-800 hover:bg-brand-50",
  ghost: "text-stone-700 hover:bg-stone-100",
  zap: "bg-zap-400 font-extrabold text-ink hover:bg-zap-300 shadow-md shadow-zap-500/20",
  danger: "bg-red-600 text-white hover:bg-red-500",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border border-brand-100 bg-surface shadow-[0_2px_12px_-4px_rgba(90,23,214,0.12)]", className)} {...props} />;
}

const tones = {
  slate: "bg-stone-100 text-stone-700 ring-stone-200",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  sky: "bg-sky-50 text-sky-800 ring-sky-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  rose: "bg-rose-50 text-rose-800 ring-rose-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  orange: "bg-orange-50 text-orange-800 ring-orange-200",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "slate", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}

const fieldBase =
  "w-full rounded-xl border border-stone-300 bg-surface px-3 text-sm text-ink placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-stone-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "py-2.5 min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-10 pr-8", className)} {...props} />;
}

export function Field({ label, hint, error, children, className, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={cn("rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `oklch(0.55 0.11 ${hue})` }}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-surface/60 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-stone-400">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-stone-500">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <span aria-hidden className="mt-2 block h-1.5 w-16 rounded-full bg-gradient-to-r from-brand-500 via-accent-500 to-zap-400" />
        {subtitle ? <p className="mt-3 max-w-2xl text-sm text-stone-600">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const statTones = {
  white: "bg-surface text-ink border-2 border-brand-500/10",
  violet: "bg-brand-500 text-white",
  pink: "bg-accent-500 text-white",
  lime: "bg-zap-400 text-ink",
  ink: "bg-ink text-white",
} as const;

export function Stat({ label, value, hint, tone = "white" }: { label: string; value: ReactNode; hint?: string; tone?: keyof typeof statTones }) {
  const accentValue = tone === "ink" ? "text-zap-300" : "";
  return (
    <div className={cn("relative overflow-hidden rounded-3xl p-5 transition hover:-translate-y-0.5", statTones[tone])}>
      {tone !== "white" ? <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/15" /> : null}
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-75">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-extrabold", accentValue)}>{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-75">{hint}</p> : null}
    </div>
  );
}

export function DemoBadge({ children = "Demo mode" }: { children?: ReactNode }) {
  return <Badge tone="amber">⚠ {children}</Badge>;
}

export function Alert({ tone = "red", children }: { tone?: "red" | "emerald" | "amber" | "sky"; children: ReactNode }) {
  const map = {
    red: "bg-red-50 text-red-800 border-red-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    sky: "bg-sky-50 text-sky-900 border-sky-200",
  };
  return <div role="status" className={cn("rounded-xl border px-3.5 py-2.5 text-sm", map[tone])}>{children}</div>;
}
