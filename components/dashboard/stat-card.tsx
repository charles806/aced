import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  /** Marks the value as sample/mock data, not real backend data. */
  sample?: boolean;
  /** Renders a loading placeholder instead of the value. */
  skeleton?: boolean;
};

export function StatCard({ icon: Icon, label, value, hint, sample, skeleton }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
        </span>
        {sample ? (
          <span className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            Sample
          </span>
        ) : null}
      </div>

      {skeleton ? (
        <div className="mt-4 space-y-2" aria-hidden="true">
          <div className="h-6 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : (
        <>
          <p className="mt-4 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {label} · {hint}
          </p>
        </>
      )}
    </div>
  );
}
