import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink" aria-label="AllWork home">
      <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-accent-500 to-zap-400 text-white shadow-md shadow-accent-500/30">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6l4 12 5-9 5 9 4-12" />
        </svg>
      </span>
      All<span className="-ml-2 text-brand-700">Work</span>
    </Link>
  );
}
