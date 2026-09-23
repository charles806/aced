"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { useSubjects } from "@/components/dashboard/use-subjects";
import {
  useNotes,
  withSubjectNames,
  type NoteWithSubjectName,
} from "@/components/dashboard/use-notes";
import { NotesSection } from "@/components/notes/notes-section";

export default function NotesPage() {
  const router = useRouter();
  const notesRef = useRef<{ openCreate: () => void }>(null);
  const [name, setName] = useState("Student");

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const frame = window.requestAnimationFrame(() => {
      if (stored) setName(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const { state: subjectsState } = useSubjects();
  const {
    state: notesState,
    reload: reloadNotes,
    setNotes,
  } = useNotes();

  const readySubjects =
    subjectsState.status === "ready" ? subjectsState.subjects : [];
  const readyNotes = notesState.status === "ready" ? notesState.notes : [];
  const displayNotes = withSubjectNames(readyNotes, readySubjects);

  const handleNoteUpdated = (note: NoteWithSubjectName) => {
    setNotes((previous) =>
      previous.map((item) => (item.id === note.id ? note : item))
    );
  };

  const handleNoteDeleted = (noteId: string) => {
    setNotes((previous) => previous.filter((item) => item.id !== noteId));
  };

  return (
    <DashboardShell name={name}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Your notes
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Study notes uploaded across all your subjects.
          </p>
        </div>
        <button
          type="button"
          onClick={() => notesRef.current?.openCreate()}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-accent-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New note
        </button>
      </div>

      <div className="mt-8">
        <NotesSection
          ref={notesRef}
          notes={displayNotes}
          loading={notesState.status === "loading"}
          error={
            notesState.status === "error"
              ? {
                  message: notesState.message,
                  unauthorized: notesState.unauthorized,
                }
              : null
          }
          onRetry={() => void reloadNotes()}
          onSignIn={() => router.push("/signin")}
          subjects={readySubjects}
          onCreated={(note) => setNotes((previous) => [note, ...previous])}
          onUpdated={handleNoteUpdated}
          onDeleted={handleNoteDeleted}
        />
      </div>
    </DashboardShell>
  );
}