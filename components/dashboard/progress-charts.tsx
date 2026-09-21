import { MOCK_COMPLETION, MOCK_STUDY_HOURS } from "@/app/dashboard/mock-data";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 4;

export function ProgressCharts() {
  const maxHours = Math.max(...MOCK_STUDY_HOURS.map((day) => day.hours));

  const lengths = MOCK_COMPLETION.map((subject) =>
    Math.max((subject.percent / 100) * CIRCUMFERENCE, SEGMENT_GAP + 1),
  );
  const segments = MOCK_COMPLETION.map((subject, index) => {
    const offset = lengths.slice(0, index).reduce((sum, length) => sum + length, 0);
    return {
      ...subject,
      dashLength: Math.max(lengths[index] - SEGMENT_GAP, 2),
      offset,
    };
  });

  const overall = Math.round(
    MOCK_COMPLETION.reduce((sum, subject) => sum + subject.percent, 0) /
      MOCK_COMPLETION.length,
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section aria-labelledby="study-time-title" className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h3 id="study-time-title" className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Study time
          </h3>
          <span className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            Sample
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Hours studied this week</p>

        <ul className="mt-5 flex h-36 items-end gap-2 sm:gap-3" aria-label="Study time per day, sample data">
          {MOCK_STUDY_HOURS.map((day) => (
            <li key={day.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className={`w-full rounded-t-md transition-[height] ${
                  day.isToday
                    ? "bg-accent-500"
                    : "bg-accent-100 dark:bg-zinc-700"
                }`}
                style={{ height: `${(day.hours / maxHours) * 100}%` }}
                role="img"
                aria-label={`${day.label}: ${day.hours} hours`}
              />
              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                {day.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="completion-title" className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h3 id="completion-title" className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Subject completion
          </h3>
          <span className="rounded-full border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            Sample
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Progress per subject</p>

        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
          <svg
            viewBox="0 0 128 128"
            className="h-32 w-32 shrink-0 -rotate-90"
            role="img"
            aria-label={`Overall subject completion: ${overall} percent, sample data`}
          >
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              className="stroke-zinc-100 dark:stroke-zinc-800"
            />
            {segments.map((segment) => (
              <circle
                key={segment.id}
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                strokeWidth="10"
                strokeLinecap="butt"
                className={segment.colorClass}
                strokeDasharray={`${segment.dashLength} ${CIRCUMFERENCE - segment.dashLength}`}
                strokeDashoffset={-segment.offset}
              />
            ))}
            <text
              x="64"
              y="64"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-zinc-900 font-display text-2xl font-semibold dark:fill-zinc-50"
              transform="rotate(90 64 64)"
            >
              {overall}%
            </text>
          </svg>

          <ul className="w-full space-y-2" aria-label="Completion by subject">
            {MOCK_COMPLETION.map((subject) => (
              <li key={subject.id} className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 shrink-0 rounded-full ${subject.colorClass}`} aria-hidden="true" />
                <span className="flex-1 truncate text-zinc-600 dark:text-zinc-300">{subject.subject}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{subject.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
