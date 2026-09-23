"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, X } from "lucide-react";
import type { NoteWithSubjectName } from "@/components/dashboard/use-notes";

type FileTypeLabel = { label: string; className: string };

function fileTypeBadge(type: string | null | undefined): FileTypeLabel {
  if (type === "application/pdf") {
    return {
      label: "PDF",
      className:
        "bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300",
    };
  }
  if (type?.startsWith("image/")) {
    return {
      label: "Image",
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }
  return {
    label: type ?? "Image",
    className:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
}

type NoteFileViewerProps = {
  note: NoteWithSubjectName;
  fileUrl: string;
  onClose: () => void;
};

export function NoteFileViewer({ note, fileUrl, onClose }: NoteFileViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const badge = fileTypeBadge(note.fileType);

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
  }, [fileUrl, onClose]);

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
            </div>

            <div className="relative mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
              {!loaded && !failed ? (
                <div
                  role="status"
                  aria-label="Loading image"
                  className="flex flex-col items-center gap-3 py-16 text-zinc-400"
                >
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  <span className="text-sm">Opening note…</span>
                </div>
              ) : null}

              {loaded && !failed ? (
                <img
                  src={fileUrl}
                  alt={`${note.title}${note.fileName ? ` — ${note.fileName}` : ""}`}
                  onLoad={() => setLoaded(true)}
                  onError={() => {
                    setLoaded(true);
                    setFailed(true);
                  }}
                  className="max-h-full w-auto max-w-full object-contain p-4"
                />
              ) : null}

              {failed ? (
                <div className="flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <AlertCircle className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      This image is no longer available
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      The file may have been deleted or moved.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to notes
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}