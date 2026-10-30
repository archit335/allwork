"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

const LINKS = [
  { href: "/work", label: "Find Work" },
  { href: "/post", label: "Post Any Work" },
  { href: "/projects", label: "Collaborate" },
  { href: "/talent", label: "Hire Talent" },
];

export function MobileMenu({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-lg text-ink hover:bg-stone-100"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-16 border-b border-stone-200 bg-surface px-4 pb-6 pt-2 shadow-lg">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 font-medium text-ink hover:bg-stone-50">{l.label}</Link>
            ))}
            <div className="my-2 h-px bg-stone-200" />
            {loggedIn ? (
              <>
                <Link href="/dashboard" className="rounded-lg px-3 py-3 font-medium text-ink hover:bg-stone-50">Dashboard</Link>
                <Link href="/dashboard/profile" className="rounded-lg px-3 py-3 font-medium text-ink hover:bg-stone-50">My Profile</Link>
                {isAdmin ? <Link href="/admin" className="rounded-lg px-3 py-3 font-medium text-ink hover:bg-stone-50">Admin</Link> : null}
                <form action={logoutAction}>
                  <button className="w-full rounded-lg px-3 py-3 text-left font-medium text-stone-500 hover:bg-stone-50">Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-3 font-medium text-ink hover:bg-stone-50">Log in</Link>
                <Link href="/signup" className="rounded-lg px-3 py-3 font-medium text-brand-700 hover:bg-stone-50">Create free account</Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
