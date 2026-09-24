"use client";

import {
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  PenLine,
  Trash2,
} from "lucide-react";
import {
  isWrittenNote,
  type NoteWithSubjectName,
} from "@/components/dashboard/use-notes";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysAgo = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );

  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fileTypeLabel(type: string | null | undefined): string {
  if (!type) return "File";
  if (type === "application/pdf") return "PDF";
  if (type.startsWith("image/")) return "Image";
  return type;
}

function hasAttachedFile(note: NoteWithSubjectName): boolean {
  return Boolean(note.fileName || note.fileUrl);
}

const actionButtonClasses =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300";

type NoteItemProps = {
  note: NoteWithSubjectName;
  onView?: (note: NoteWithSubjectName) => void;
  onEdit?: (note: NoteWithSubjectName) => void;
  onDelete?: (note: NoteWithSubjectName) => void;
  viewing?: boolean;
  deleting?: boolean;
};

export function NoteItem({
  note,
  onView,
  onEdit,
  onDelete,
  viewing = false,
  deleting = false,
}: NoteItemProps) {
  const showActions = Boolean(onView || onEdit || onDelete);
  const written = isWrittenNote(note);
  const viewable = written || hasAttachedFile(note);
  const rowClickable = Boolean(onView) && viewable && !viewing && !deleting;

  return (
    <li
      onClick={() => {
        if (rowClickable && onView) onView(note);
      }}
      className={`group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
        rowClickable ? "cursor-pointer" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-400 transition group-hover:text-accent-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
        {written ? (
          <PenLine className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
        ) : (
          <FileText className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={2} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {note.title}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {written ? (
            "Written"
          ) : note.fileName ? (
            <>
              {note.fileName}
              {fileTypeLabel(note.fileType) ? (
                <span className="text-zinc-400 dark:text-zinc-500">
                  {" · "}
                  {fileTypeLabel(note.fileType)}
                </span>
              ) : null}
            </>
          ) : (
            fileTypeLabel(note.fileType)
          )}
        </p>
      </div>

      <span className="shrink-0 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
        {note.subjectName}
      </span>

      <time
        dateTime={note.createdAt}
        className="w-20 shrink-0 text-right text-xs text-zinc-400 dark:text-zinc-500"
      >
        {formatRelativeDate(note.createdAt)}
      </time>

      {showActions ? (
        <span
          role="group"
          aria-label={`Actions for ${note.title}`}
          className="flex shrink-0 items-center gap-1"
        >
          {onView ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onView(note);
              }}
              disabled={viewing || deleting || !viewable}
              title={viewable ? "Open note" : "No file available"}
              aria-label={`Open ${note.title}`}
              className={actionButtonClasses}
            >
              {viewing ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ExternalLink
                  className="h-3.5 w-3.5"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              )}
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(note);
              }}
              disabled={deleting}
              aria-label={`Edit ${note.title}`}
              className={actionButtonClasses}
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
              onClick={(event) => {
                event.stopPropagation();
                onDelete(note);
              }}
              disabled={deleting}
              aria-label={`Delete ${note.title}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <Trash2
                className="h-3.5 w-3.5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </span>
      ) : null}

      {deleting ? (
        <div
          role="status"
          aria-label={`Deleting ${note.title}`}
          className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60"
        >
          <Loader2
            className="h-5 w-5 animate-spin text-accent-500"
            aria-hidden="true"
          />
        </div>
      ) : null}
    </li>
  );
}

export function NoteItemSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-4" aria-hidden="true">
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="h-5 w-16 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
    </li>
  );
}