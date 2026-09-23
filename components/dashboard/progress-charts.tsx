import { BarChart3, PieChart, type LucideIcon } from "lucide-react";

function ChartEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {title}
      </p>
      <p className="mt-1 max-w-xs text-xs text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
    </div>
  );
}

export function ProgressCharts() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section
        aria-labelledby="study-time-title"
        className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h3
          id="study-time-title"
          className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Study time
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Hours studied this week
        </p>
        <ChartEmpty
          icon={BarChart3}
          title="No study time yet"
          description="Weekly study tracking is coming soon."
        />
      </section>

      <section
        aria-labelledby="completion-title"
        className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h3
          id="completion-title"
          className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Subject completion
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Progress per subject
        </p>
        <ChartEmpty
          icon={PieChart}
          title="No progress tracked yet"
          description="Progress per subject will appear here once tracking is available."
        />
      </section>
    </div>
  );
}