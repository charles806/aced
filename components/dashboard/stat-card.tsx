import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/dashboard/micro-motion";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  /** Marks the value as sample/mock data, not real backend data. */
  sample?: boolean;
  /** Renders a loading placeholder instead of the value. */
  skeleton?: boolean;
  /** Optional decorative tape annotation. */
  annotation?: string;
};

function hashAngle(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return (hash % 5) - 2;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  sample,
  skeleton,
  annotation,
}: StatCardProps) {
  return (
    <div
      className="group paper-grain relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-16px_rgba(24,24,27,0.14)] transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_2px_4px_rgba(24,24,27,0.04),0_12px_28px_-16px_rgba(24,24,27,0.18)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)] dark:hover:border-zinc-700"
      style={{ ["--sticker-angle" as string]: `${hashAngle(label)}deg` }}
    >
      {annotation ? (
        <span
          aria-hidden="true"
          className="tape absolute -top-2.5 right-4 w-fit rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          {annotation}
        </span>
      ) : null}

      <div className="relative flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-transform duration-300 group-hover:animate-float group-hover:scale-110 dark:bg-accent-500/10 dark:text-accent-400 dark:group-hover:animate-none"
          style={{ ["--tilt" as string]: "0deg" }}
        >
          <Icon className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
        </span>
        {sample ? (
          <span className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            Sample
          </span>
        ) : null}
      </div>

      {skeleton ? (
        <div className="relative mt-4 space-y-2" aria-hidden="true">
          <div className="h-6 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : (
        <>
          <p className="relative mt-4 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            <CountUp value={value} />
          </p>
          <p className="relative mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {label} · {hint}
          </p>
        </>
      )}
    </div>
  );
}