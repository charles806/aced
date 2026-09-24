"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, PenLine, X } from "lucide-react";
import type { NoteWithSubjectName } from "@/components/dashboard/use-notes";

type WrittenNoteViewerProps = {
  note: NoteWithSubjectName;
  onClose: () => void;
};

export function WrittenNoteViewer({ note, onClose }: WrittenNoteViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing ${note.title}`}
          tabIndex={-1}
          className="flex min-h-full flex-col p-4 outline-none sm:p-6"
        >
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-t-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-zinc-600 transition hover:text-zinc-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to notes
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {note.title}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:hover:text-zinc-300"
            >
              <X
                className="h-4.5 w-4.5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
            <div className="flex items-center gap-2 rounded-b-2xl border border-t-0 border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
                <PenLine
                  className="mr-1 inline-block h-3 w-3"
                  aria-hidden="true"
                  strokeWidth={1.8}
                />
                Written
              </span>
              {note.subjectName ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {note.subjectName}
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="prose prose-zinc max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {note.content}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
              <span>
                Created{" "}
                {new Date(note.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {note.updatedAt !== note.createdAt ? (
                <span>
                  Updated{" "}
                  {new Date(note.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
