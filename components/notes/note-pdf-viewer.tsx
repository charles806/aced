"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";
import type { NoteWithSubjectName } from "@/components/dashboard/use-notes";
import { NoteSummary } from "@/components/notes/note-summary";
import { fileTypeBadge } from "@/components/notes/note-file-viewer";

type NotePdfViewerProps = {
  note: NoteWithSubjectName;
  fileUrl: string;
  onClose: () => void;
};

export function NotePdfViewer({ note, fileUrl, onClose }: NotePdfViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const badge = fileTypeBadge(note.fileType);

  // `onClose` is an inline arrow at every call site, so it changes identity on
  // each render. Holding it in a ref keeps the effect below mount-only.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Viewing ${note.title}`}
          tabIndex={-1}
          className="flex min-h-full flex-col p-4 outline-none sm:p-6"
        >
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 rounded-t-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
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
              {note.fileName ? (
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {note.fileName}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:hover:text-zinc-300"
            >
              <X className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
            <div className="flex items-center gap-2 rounded-b-2xl border border-t-0 border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
              {note.subjectName ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {note.subjectName}
                </span>
              ) : null}
            </div>

            <div className="relative mt-4 flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
              <iframe
                src={fileUrl}
                title={`${note.title}${note.fileName ? ` — ${note.fileName}` : ""}`}
                className="min-h-[60vh] w-full flex-1"
              />
            </div>

            <div className="mt-4">
              <NoteSummary noteId={note.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
