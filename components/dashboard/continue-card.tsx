import { Play } from "lucide-react";
import type { MockContinueItem } from "@/app/dashboard/mock-data";

export function ContinueCard({ item }: { item: MockContinueItem }) {
  // TODO(dashboard): replace with real resume logic — navigate to the actual
  // study view / session once subjects & notes have backend routes.
  const handleContinue = () => {};

  return (
    <article className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          <span className={`h-2 w-2 rounded-full ${item.subjectColorClass}`} aria-hidden="true" />
          {item.subject}
        </p>
        <h3 className="mt-1 truncate font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {item.topic}
        </h3>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-1.5 w-full max-w-40 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            role="progressbar"
            aria-valuenow={item.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${item.topic} progress`}
          >
            <div
              className="h-full rounded-full bg-accent-500 transition-[width]"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {item.progress}%
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        Continue
      </button>
    </article>
  );
}
