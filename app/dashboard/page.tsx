"use client";

import { useRouter } from "next/navigation";
import { Bell, Plus } from "lucide-react";
import { useTheme } from "@/components/useTheme";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "../actions/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const greeting = (() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    return stored ? `Welcome back, ${stored}` : "Welcome back";
  })();

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Aced
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-zinc-300/70 text-zinc-500 sm:inline-flex dark:border-zinc-700 dark:text-zinc-400">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </span>
            <ThemeToggle dark={dark} onToggle={toggle} />
            <button
              type="button"
              onClick={async () => {
                await logout()
                router.push("/signin")
              }}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              This is a placeholder dashboard — content lands here once Radon
              auth is wired end to end.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New note</span>
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="mt-4 h-8 w-24 animate-pulse rounded-lg bg-accent-500/20" />
            </div>
          ))}
        </div>

        {/* TODO(Radon Auth): replace this mock shell with the real dashboard —
            server-rendered via getUserFromRequest(auth, req) as it was in
            app/dashboard/page.tsx.bak */}
      </main>
    </div>
  );
}