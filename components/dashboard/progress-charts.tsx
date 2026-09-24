import { BarChart3, BookOpen, type LucideIcon } from "lucide-react";
import { formatDuration } from "@/app/lib/format";
import type { StudyStats } from "@/components/dashboard/use-progress";

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

function WeekChart({ stats }: { stats: StudyStats }) {
  const maxMs = Math.max(1, ...stats.weekByDay.map((day) => day.ms));
  const todayIndex = stats.weekByDay.length - 1;

  return (
    <div className="grid grid-cols-7 gap-1 pb-1 pt-4" aria-label="Study time by day">
      {stats.weekByDay.map((day, index) => {
        const height = day.ms > 0 ? Math.max(8, (day.ms / maxMs) * 100) : 3;
        const isToday = index === todayIndex;

        return (
          <div
            key={day.date}
            className="flex min-w-0 flex-col items-center gap-1.5"
          >
            <span className="sr-only">{`${day.day}: ${formatDuration(
              day.ms / 1000
            )}`}</span>
            <div className="flex h-28 w-full items-end justify-center">
              <span
                aria-hidden="true"
                className={`w-full max-w-8 rounded-t-md animate-grow-up ${
                  day.ms > 0
                    ? "bg-accent-500"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
                style={{
                  height: `${height}%`,
                  animationDelay: `${index * 70}ms`,
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
              {day.ms > 0 ? formatDuration(day.ms / 1000) : "–"}
            </span>
            <span
              className={`text-xs font-medium ${
                isToday
                  ? "text-accent-600 dark:text-accent-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {day.day}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SubjectChart({ stats }: { stats: StudyStats }) {
  const top = stats.bySubject.slice(0, 6);
  const maxMs = Math.max(1, ...top.map((item) => item.ms));

  return (
    <div className="space-y-4 pt-4" aria-label="Study time by subject">
      {top.map((item) => (
        <div key={item.subjectId ?? "general"}>
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="min-w-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200"
              title={item.subjectName}
            >
              {item.subjectName}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {formatDuration(item.ms / 1000)}
            </span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            role="img"
            aria-label={`${item.subjectName}: ${formatDuration(item.ms / 1000)}`}
          >
            <div
              className="h-full rounded-full bg-accent-500 animate-grow-width"
              style={{
                ["--grow-width" as string]: `${Math.max(
                  4,
                  (item.ms / maxMs) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressCharts({ stats }: { stats: StudyStats }) {
  const weekHasData = stats.weekMs > 0;
  const subjectsHaveData = stats.bySubject.some((item) => item.ms > 0);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section
        aria-labelledby="study-time-title"
        className="group relative paper-grain rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-16px_rgba(24,24,27,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]"
      >
        <span
          aria-hidden="true"
          className="tape absolute -top-3 right-6 w-fit rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          this week
        </span>
        <h3
          id="study-time-title"
          className="relative font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Study time
        </h3>
        <p className="relative mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Hours studied this week
        </p>
        {weekHasData ? (
          <WeekChart stats={stats} />
        ) : (
          <ChartEmpty
            icon={BarChart3}
            title="No study time yet"
            description="Complete a study session and your weekly time will show up here."
          />
        )}
      </section>

      <section
        aria-labelledby="completion-title"
        className="relative paper-grain rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-16px_rgba(24,24,27,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]"
      >
        <h3
          id="completion-title"
          className="relative font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Study time by subject
        </h3>
        <p className="relative mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Time spent per subject
        </p>
        {subjectsHaveData ? (
          <SubjectChart stats={stats} />
        ) : (
          <ChartEmpty
            icon={BookOpen}
            title="No per-subject time yet"
            description="Start sessions with a subject selected to see a breakdown here."
          />
        )}
      </section>
    </div>
  );
}