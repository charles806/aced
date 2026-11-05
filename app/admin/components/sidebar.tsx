'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ items }: { items: { href: string; label: string; exact?: boolean }[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-zinc-200 dark:lg:border-zinc-800 lg:bg-white dark:lg:bg-zinc-950">
      <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
        <span className="font-playfair text-xl font-semibold tracking-tight">ACED Admin</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        Internal only • Super Admin
      </div>
    </aside>
  );
}
