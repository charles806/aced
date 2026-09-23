"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/dashboard/dialog";
import { apiRequest } from "@/app/lib/api-client";
import type { NoteWithSubjectName } from "@/components/dashboard/use-notes";

const bannerClasses =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300";

const secondaryButtonClasses =
  "inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

type DeleteNoteProps = {
  open: boolean;
  note: NoteWithSubjectName | null;
  onClose: () => void;
  onDeleted: (noteId: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

export function DeleteNote({
  open,
  note,
  onClose,
  onDeleted,
  onBusyChange,
}: DeleteNoteProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!note) return;

    setDeleting(true);
    onBusyChange?.(true);
    setError(null);

    const result = await apiRequest<{ message: string }>(
      `/api/notes/${note.id}`,
      {
        method: "DELETE",
        notFoundMessage: "That note no longer exists.",
      }
    );

    if (!result.ok) {
      const { failure } = result;

      if (failure.kind === "not-found") {
        // Already gone — treat as success and quietly drop the stale row.
        setDeleting(false);
        onBusyChange?.(false);
        onDeleted(note.id);
        onClose();
        return;
      }

      setError(failure.message);
      setDeleting(false);
      onBusyChange?.(false);
      return;
    }

    setDeleting(false);
    onBusyChange?.(false);
    onDeleted(note.id);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!deleting) onClose();
      }}
      title="Delete note"
      description={
        note
          ? `Delete “${note.title}”? This can't be undone.`
          : undefined
      }
    >
      {error ? (
        <div role="alert" className={`mb-4 ${bannerClasses}`}>
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={deleting}
          className={secondaryButtonClasses}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirmDelete()}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-600/30 transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Deleting…
            </>
          ) : (
            "Delete note"
          )}
        </button>
      </div>
    </Dialog>
  );
}