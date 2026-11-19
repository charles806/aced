"use client";

import { Sparkles } from "lucide-react";

export function UpgradeCard() {
  return (
    <section
      aria-labelledby="upgrade-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="upgrade-title"
            className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            ACED is completely free
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            All features are included at no cost — no subscription required.
          </p>
        </div>
      </div>
    </section>
  );
}