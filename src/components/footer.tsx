import Link from "next/link";
import { Logo } from "./logo";

const cols = [
  { title: "Work", links: [["Find Work", "/work"], ["Post Any Work", "/post"], ["Hire Talent", "/talent"]] },
  { title: "Build", links: [["Collaborate", "/projects"], ["Start a project", "/projects/new"], ["Dashboard", "/dashboard"]] },
  { title: "Company", links: [["Why we started", "/#story"], ["Our mission", "/#mission"], ["FAQ", "/#faq"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-stone-600">Any Work. Any Skill. Any Person. One Platform.</p>
          <p className="mt-4 font-display text-sm font-semibold text-brand-800">“Your Skills Should Never Go Unused.”</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold text-ink">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map(([l, h]) => (
                <li key={h}><Link href={h} className="text-sm text-stone-600 hover:text-brand-700">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-100 py-5 text-center text-xs text-stone-500">© {new Date().getFullYear()} AllWork (working name). Built in India, for everyone.</div>
    </footer>
  );
}
