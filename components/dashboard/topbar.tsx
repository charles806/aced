"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Settings } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/useTheme";
import { logout } from "@/app/actions/auth";
import { getNavItemLabel } from "./nav-config";

export function Topbar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push("/signin");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard" className="group lg:hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 focus-visible:rounded-lg">
            <span className="inline-block transition-transform duration-300 group-hover:rotate-[-6deg]">
              <LogoMark />
            </span>
          </Link>
          <h1 className="pin-dot relative hidden font-display text-lg font-semibold text-zinc-900 lg:block dark:text-zinc-50">
            {getNavItemLabel(pathname)}
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-2 w-10 -rotate-1 rounded-sm bg-accent-200/60 dark:bg-accent-500/25"
            />
          </h1>
          <span className="font-display text-lg font-semibold text-zinc-900 lg:hidden dark:text-zinc-50">
            ACED
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* TODO(dashboard): connect notifications once the backend exists. */}
          <button
            type="button"
            aria-label="Notifications (coming soon)"
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-zinc-300/70 bg-white/70 text-zinc-500 transition-all duration-200 hover:-translate-y-0.5 hover:text-zinc-900 hover:shadow-sm active:scale-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400 dark:hover:text-white"
          >
            <Bell className="h-4 w-4 animate-float dark:animate-none" aria-hidden="true" style={{ ["--tilt" as string]: "0deg" }} />
          </button>

          <ThemeToggle dark={dark} onToggle={toggle} />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:rotate-[3deg] hover:bg-accent-600 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
            >
              {(name || "S").charAt(0).toUpperCase()}
            </button>

            {menuOpen ? (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-11 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg shadow-zinc-950/5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{name}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Student account</p>
                </div>
                <Link
                  href="/dashboard/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
