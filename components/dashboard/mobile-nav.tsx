"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV, type NavItem } from "./nav-config";

function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <ul
        className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]"
        role="list"
      >
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-1 rounded-xl px-2 pb-1.5 pt-2.5 text-[10px] font-medium transition-all active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 ${
                  active
                    ? "text-accent-600 dark:text-accent-400"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <span
                  className={`rounded-lg px-2 py-0.5 transition-all ${
                    active
                      ? "bg-accent-50 dark:bg-accent-500/10"
                      : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`}
                    aria-hidden="true"
                    strokeWidth={active ? 2.25 : 2}
                  />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
