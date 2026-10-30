import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Logo } from "./logo";
import { LinkButton, Avatar } from "./ui";
import { MobileMenu } from "./mobile-menu";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/app/actions/auth";

export const NAV = [
  { href: "/work", label: "Find Work" },
  { href: "/post", label: "Post Any Work" },
  { href: "/projects", label: "Collaborate" },
  { href: "/talent", label: "Hire Talent" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell initial={unread} />
              <LinkButton href="/dashboard" variant="secondary" size="sm" className="hidden sm:inline-flex">
                Dashboard
              </LinkButton>
              {user.role === "ADMIN" ? (
                <LinkButton href="/admin" variant="ghost" size="sm" className="hidden sm:inline-flex">Admin</LinkButton>
              ) : null}
              <Link href="/dashboard/profile" className="hidden sm:block" aria-label="My profile">
                <Avatar name={user.name} src={user.avatarUrl} size={34} />
              </Link>
              <form action={logoutAction} className="hidden sm:block">
                <button className="text-sm font-medium text-stone-500 hover:text-ink">Log out</button>
              </form>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</LinkButton>
              <LinkButton href="/signup" size="sm" variant="accent"><span className="sm:hidden">Join</span><span className="hidden sm:inline">Join free ✦</span></LinkButton>
            </>
          )}
          <MobileMenu loggedIn={!!user} isAdmin={user?.role === "ADMIN"} />
        </div>
      </div>
    </header>
  );
}
