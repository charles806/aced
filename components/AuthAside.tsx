"use client";

import Image from "next/image";
import { LogoMark } from "./logo-mark";
import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./useTheme";

export function AuthAside() {
  const { dark, toggle } = useTheme();

  return (
    <aside className="relative flex flex-col overflow-hidden border-b border-zinc-200 bg-paper-100/70 px-6 pb-10 pt-6 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-10 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 dotted-bg opacity-30 dark:opacity-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent-200/30 blur-3xl dark:bg-accent-500/10"
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            ACED
          </span>
        </div>
        <ThemeToggle dark={dark} onToggle={toggle} />
      </div>

      <div className="relative mx-auto mt-8 w-full max-w-md lg:mt-12">
        <div className="relative">
          <div className="tape relative z-10 hidden w-fit rotate-[-2deg] rounded-lg bg-white/90 px-3 py-2 shadow-sm sm:block">
            <span className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-300">
              your study space
            </span>
          </div>
          <div className="paper-grain -mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-paper-50 p-2 shadow-[0_2px_4px_rgba(24,24,27,0.04),0_16px_32px_-16px_rgba(24,24,27,0.18)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_16px_32px_-16px_rgba(0,0,0,0.7)]">
            <Image
              src="/previews/notes.svg"
              alt="ACED notes and subjects preview"
              width={1200}
              height={780}
              className="h-auto w-full rounded-xl border border-zinc-200/80 dark:border-zinc-800"
            />
          </div>
          <span className="absolute -bottom-3 -right-4 hidden rotate-[2deg] rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-sm sm:block dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-accent-600 dark:text-accent-400">
              notes, subjects, progress ✦
            </span>
          </span>
        </div>
      </div>

      <div className="relative mt-9 lg:mt-auto lg:pt-10">
        <p className="font-display text-2xl font-semibold leading-snug text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Your knowledge,
          <br />
          in one quiet place.
        </p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Keep every note, subject and study session organized — and use
          AI to understand what you&apos;re learning.
        </p>
      </div>
    </aside>
  );
}