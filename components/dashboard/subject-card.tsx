"use client";

import { CalendarDays, Loader2, Pencil, Trash2 } from "lucide-react";
import type { Subject } from "@/components/dashboard/use-subjects";

const AVATAR_COLOR_CLASSES = [
  "bg-accent-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-violet-500",
];

function avatarColorClass(name: string): string {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }

  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length];
}

// Rendered in UTC so SSR and client output always match.
function formatAddedDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

type SubjectCardProps = {
  subject: Subject;
  onEdit?: (subject: Subject) => void;
  onDelete?: (subject: Subject) => void;
  deleting?: boolean;
};

export function SubjectCard({
  subject,
  onEdit,
  onDelete,
  deleting = false,
}: SubjectCardProps) {
  const showActions = Boolean(onEdit || onDelete);

  return (
    <article
      className={`group relative rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 ${
        deleting ? "pointer-events-none opacity-50" : ""
      }`}
    >
      {showActions ? (
        <div className="absolute right-3 top-3 flex items-center gap-1">
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(subject)}
              disabled={deleting}
              aria-label={`Edit ${subject.name}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 disabled:cursor-not-allowed dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <Pencil
                className="h-3.5 w-3.5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(subject)}
              disabled={deleting}
              aria-label={`Delete ${subject.name}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:cursor-not-allowed dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <Trash2
                className="h-3.5 w-3.5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={showActions ? "flex items-center gap-3 pr-14" : "flex items-center gap-3"}>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white ${avatarColorClass(
            subject.name,
          )}`}
          aria-hidden="true"
        >
          {subject.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {subject.name}
          </h3>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <CalendarDays className="h-3 w-3" aria-hidden="true" />
        Added {formatAddedDate(subject.createdAt)}
      </p>

      {deleting ? (
        <div
          role="status"
          aria-label={`Deleting ${subject.name}`}
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60 dark:bg-zinc-900/60"
        >
          <Loader2
            className="h-5 w-5 animate-spin text-accent-500"
            aria-hidden="true"
          />
        </div>
      ) : null}
    </article>
  );
}

export function SubjectCardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="mt-4 h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}
