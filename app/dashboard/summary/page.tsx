"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, FileText, PenLine, SearchX, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/marketing/reveal";
import {
  isWrittenNote,
  useNotes,
  withSubjectNames,
} from "@/components/dashboard/use-notes";
import { useSubjects } from "@/components/dashboard/use-subjects";
import { NoteSummary } from "@/components/notes/note-summary";
import { fileTypeBadge } from "@/components/notes/note-file-viewer";

function noteTypeLabel(note: { fileType: string | null }): string {
  if (note.fileType === "application/pdf") return "PDF";
  if (note.fileType?.startsWith("image/")) return "Image";
  return "Written";
}

function SummaryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteIdParam = searchParams.get("noteId");
  const noteId =
    noteIdParam && noteIdParam.trim() !== "" ? noteIdParam.trim() : null;

  const { state: notesState, reload: reloadNotes } = useNotes();
  const { state: subjectsState } = useSubjects();

  const notes = useMemo(() => {
    if (notesState.status !== "ready") return [];
    const readySubjects =
      subjectsState.status === "ready" ? subjectsState.subjects : [];
    return withSubjectNames(notesState.notes, readySubjects);
  }, [notesState, subjectsState]);
  const selectedNote = noteId ? (notes.find((n) => n.id === noteId) ?? null) : null;
  // A noteId in the URL that is not in the user's own list is treated as
  // missing — the summary panel is never rendered for it, and the backend
  // would reject it as well (notes are always scoped to the session user).
  const unknownNoteSelected =
    noteId !== null && notesState.status === "ready" && selectedNote === null;

  const handleNoteChange = (next: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("noteId", next);
    } else {
      params.delete("noteId");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const renderContent = () => {
    if (notesState.status === "loading") {
      return (
        <div
          role="status"
          aria-label="Loading notes"
          className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      );
    }

    if (notesState.status === "error") {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load your notes"
          description={notesState.message}
          cta={{
            label: notesState.unauthorized ? "Sign in again" : "Try again",
            onClick: () => {
              if (notesState.unauthorized) {
                router.push("/signin");
                return;
              }
              void reloadNotes();
            },
          }}
        />
      );
    }

    if (notes.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Write a note or upload a file first — then come back here to summarize it."
          cta={{ label: "Go to notes", onClick: () => router.push("/dashboard/notes") }}
        />
      );
    }

    if (!selectedNote) {
      return (
        <EmptyState
          icon={unknownNoteSelected ? SearchX : Sparkles}
          title={unknownNoteSelected ? "Note not found" : "Choose a note to summarize"}
          description={
            unknownNoteSelected
              ? "That note doesn't exist or belongs to a different selection. Pick one of your notes above."
              : "Pick one of your notes above and its saved summary will appear here — or generate a new one."
          }
        />
      );
    }

    const badge = fileTypeBadge(selectedNote.fileType);
    const written = isWrittenNote(selectedNote);

    return (
      <div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {written ? (
                <PenLine
                  className="mr-1 inline-block h-3 w-3"
                  aria-hidden="true"
                  strokeWidth={1.8}
                />
              ) : null}
              {noteTypeLabel(selectedNote)}
            </span>
            {selectedNote.subjectName ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {selectedNote.subjectName}
              </span>
            ) : null}
            {!written &&
            selectedNote.extractionStatus &&
            selectedNote.extractionStatus !== "completed" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Text extraction {selectedNote.extractionStatus}
              </span>
            ) : null}
          </div>

          <h2 className="mt-2 font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {selectedNote.title}
          </h2>
          {selectedNote.fileName ? (
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {selectedNote.fileName}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Created{" "}
            {new Date(selectedNote.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {selectedNote.updatedAt !== selectedNote.createdAt ? (
              <>
                {" · Updated "}
                {new Date(selectedNote.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </>
            ) : null}
          </p>
        </div>

        <div className="mt-4">
          <NoteSummary key={selectedNote.id} noteId={selectedNote.id} />
        </div>
      </div>
    );
  };

  return (
    <DashboardShell name="Student">
      <Reveal direction="up">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
              AI Summary
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Pick a note to read or generate its study summary.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor="summary-note-picker" className="sr-only">
              Choose a note to summarize
            </label>
            <select
              id="summary-note-picker"
              value={noteId ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                handleNoteChange(value === "" ? null : value);
              }}
              disabled={notesState.status !== "ready"}
              className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-400 dark:focus:ring-accent-500/20"
            >
              <option value="">Choose a note…</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal direction="up" delay={0.05}>
        <div className="mt-6">{renderContent()}</div>
      </Reveal>
    </DashboardShell>
  );
}

export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell name="Student">
          <div className="flex min-h-[32rem] flex-col items-center justify-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-500 dark:bg-accent-500/10 dark:text-accent-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Loading summary…
            </p>
          </div>
        </DashboardShell>
      }
    >
      <SummaryPageContent />
    </Suspense>
  );
}
