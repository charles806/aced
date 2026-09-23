"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AlertCircle, FileText, SearchX, X } from "lucide-react";
import { apiRequest } from "@/app/lib/api-client";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NoteItem, NoteItemSkeleton } from "@/components/dashboard/note-item";
import type { Subject } from "@/components/dashboard/use-subjects";
import type { NoteWithSubjectName } from "@/components/dashboard/use-notes";
import { CreateNote } from "@/components/notes/create-note";
import { EditNote } from "@/components/notes/edit-note";
import { DeleteNote } from "@/components/notes/delete-note";
import { NoteFileViewer } from "@/components/notes/note-file-viewer";

type NoteError = { message: string; unauthorized: boolean };

type NoteFileAccess = {
  url: string;
  fileType: string | null;
  fileName: string | null;
  title: string;
};

type ImagePreview = { note: NoteWithSubjectName; url: string };

export type NotesSectionHandle = { openCreate: () => void };

type NoteNotice =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type NotesSectionProps = {
  notes: NoteWithSubjectName[];
  loading: boolean;
  error: NoteError | null;
  onRetry: () => void;
  onSignIn: () => void;
  subjects: Subject[];
  onCreated: (note: NoteWithSubjectName) => void;
  onUpdated: (note: NoteWithSubjectName) => void;
  onDeleted: (noteId: string) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

const NOTICE_MS = 5000;

const successBannerClasses =
  "rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-950/40 dark:text-emerald-300";

const errorBannerClasses =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300";

export const NotesSection = forwardRef<NotesSectionHandle, NotesSectionProps>(
  function NotesSection(
    {
      notes,
      loading,
      error,
      onRetry,
      onSignIn,
      subjects,
      onCreated,
      onUpdated,
      onDeleted,
      hasActiveFilters = false,
      onClearFilters,
    },
    ref
  ) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<NoteWithSubjectName | null>(null);
    const [deleting, setDeleting] = useState<NoteWithSubjectName | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
    const [notice, setNotice] = useState<NoteNotice | null>(null);
    const noticeTimerRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({ openCreate: () => setCreateOpen(true) }), []);

    const showNotice = (next: NoteNotice) => {
      setNotice(next);
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      noticeTimerRef.current = window.setTimeout(() => {
        setNotice(null);
        noticeTimerRef.current = null;
      }, NOTICE_MS);
    };

    useEffect(
      () => () => {
        if (noticeTimerRef.current !== null) {
          window.clearTimeout(noticeTimerRef.current);
        }
      },
      []
    );

    const handleCreated = (note: NoteWithSubjectName) => {
      onCreated(note);
      showNotice({ kind: "success", message: "Note created." });
    };

    const handleUpdated = (note: NoteWithSubjectName) => {
      onUpdated(note);
      showNotice({ kind: "success", message: "Note updated." });
    };

    const handleEditNotFound = (noteId: string) => {
      setEditing(null);
      onDeleted(noteId);
      showNotice({ kind: "success", message: "That note no longer exists." });
    };

    const handleDeleted = (noteId: string) => {
      onDeleted(noteId);
      showNotice({ kind: "success", message: "Note deleted." });
    };

    const handleView = async (note: NoteWithSubjectName) => {
      if (viewingId) return;

      setViewingId(note.id);

      const result = await apiRequest<NoteFileAccess>(
        `/api/notes/${note.id}/file`,
        {
          notFoundMessage: "That note no longer exists.",
        }
      );

      if (!result.ok) {
        setViewingId(null);

        if (result.failure.kind === "not-found") {
          onDeleted(note.id);
          showNotice({ kind: "success", message: "That note no longer exists." });
          return;
        }

        if (result.failure.kind === "unauthorized") {
          onSignIn();
          return;
        }

        showNotice({
          kind: "error",
          message: "We couldn't open the note. Please try again.",
        });
        return;
      }

      setViewingId(null);

      const { url, fileType } = result.data;

      if (!url) {
        showNotice({
          kind: "error",
          message: "We couldn't open the note. Please try again.",
        });
        return;
      }

      if (fileType?.startsWith("image/")) {
        setImagePreview({ note, url });
        return;
      }

      if (fileType && fileType !== "application/pdf") {
        showNotice({
          kind: "error",
          message: "This note's file type isn't supported for viewing.",
        });
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    };

    const renderList = () => {
      if (loading) {
        return (
          <ul
            className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((index) => (
              <NoteItemSkeleton key={index} />
            ))}
          </ul>
        );
      }

      if (error) {
        return (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load your notes"
            description={error.message}
            cta={{
              label: error.unauthorized ? "Sign in again" : "Try again",
              onClick: () => {
                if (error.unauthorized) {
                  onSignIn();
                  return;
                }
                onRetry();
              },
            }}
          />
        );
      }

      if (notes.length === 0) {
        return (
          <EmptyState
            icon={hasActiveFilters ? SearchX : FileText}
            title={hasActiveFilters ? "No notes found" : "No notes yet"}
            description={
              hasActiveFilters
                ? "Try a different search or clear your filters to see all your notes."
                : "Upload your first study note and it will appear here, ready to review."
            }
            cta={
              hasActiveFilters
                ? { label: "Clear filters", onClick: () => onClearFilters?.() }
                : { label: "New note", onClick: () => setCreateOpen(true) }
            }
          />
        );
      }

      return (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onView={() => void handleView(note)}
              onEdit={() => setEditing(note)}
              onDelete={() => setDeleting(note)}
              viewing={viewingId === note.id}
              deleting={deletingId === note.id}
            />
          ))}
        </ul>
      );
    };

    return (
      <div>
        {notice ? (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            className={`mb-4 flex items-start justify-between gap-3 ${
              notice.kind === "error" ? errorBannerClasses : successBannerClasses
            }`}
          >
            <span className="min-w-0 flex-1">{notice.message}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-current opacity-70 transition hover:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-current/30"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {renderList()}

        {createOpen ? (
          <CreateNote
            open
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        ) : null}

        {editing ? (
          <EditNote
            key={editing.id}
            open
            note={editing}
            subjects={subjects}
            onClose={() => setEditing(null)}
            onUpdated={handleUpdated}
            onNotFound={handleEditNotFound}
          />
        ) : null}

        {deleting ? (
          <DeleteNote
            key={deleting.id}
            open
            note={deleting}
            onClose={() => setDeleting(null)}
            onDeleted={handleDeleted}
            onBusyChange={(busy) =>
              setDeletingId(busy && deleting ? deleting.id : null)
            }
          />
        ) : null}

        {imagePreview ? (
          <NoteFileViewer
            note={imagePreview.note}
            fileUrl={imagePreview.url}
            onClose={() => setImagePreview(null)}
          />
        ) : null}
      </div>
    );
  }
);