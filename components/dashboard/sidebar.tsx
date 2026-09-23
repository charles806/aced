"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo-mark";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { NAV_ITEMS, SIDEBAR_BOTTOM_NAV, type NavItem } from "./nav-config";

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 ${
        active
          ? "bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      <item.icon
        className="h-4.5 w-4.5 shrink-0"
        aria-hidden="true"
        strokeWidth={active ? 2.25 : 2}
      />
      {item.label}
    </Link>
  );
}

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-900">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-5 py-5 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
      >
        <LogoMark />
        <span className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ACED
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        {SIDEBAR_BOTTOM_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <UpgradeButton onUnauthorized={() => router.push("/signin")} />
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {(name || "S").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{name}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Student</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
