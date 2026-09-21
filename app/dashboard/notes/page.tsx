"use client";

import { useEffect, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NoteItem } from "@/components/dashboard/note-item";
import type { MockNote } from "@/app/dashboard/mock-data";
import {
  CreateNote,
  type NoteWithSubjectName,
} from "@/components/notes/create-note";

function toMockNote(note: NoteWithSubjectName): MockNote {
  return {
    id: note.id,
    title: note.title,
    fileName: note.fileName ?? "",
    subjectId: note.subjectId,
    subjectName: note.subjectName,
    createdAt: note.createdAt,
  };
}

export default function NotesPage() {
  const [name, setName] = useState("Student");
  const [showCreate, setShowCreate] = useState(false);
  const [notes, setNotes] = useState<NoteWithSubjectName[]>([]);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const frame = window.requestAnimationFrame(() => {
      if (stored) setName(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleNoteCreated = (note: NoteWithSubjectName) => {
    setNotes((previous) => [note, ...previous]);
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
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-accent-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New note
        </button>
      </div>

      <div className="mt-8">
        {notes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No notes yet"
            description="Upload your first study note and it will appear here, ready to review."
            cta={{ label: "Create a note", onClick: () => setShowCreate(true) }}
          />
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {notes.map((note) => (
              <NoteItem key={note.id} note={toMockNote(note)} />
            ))}
          </ul>
        )}
      </div>

      <CreateNote
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleNoteCreated}
      />
    </DashboardShell>
  );
}
