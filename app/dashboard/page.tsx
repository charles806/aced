"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Clock,
  FileText,
  Flame,
  Plus,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContinueCard } from "@/components/dashboard/continue-card";
import { AITutorCard } from "@/components/dashboard/ai-tutor-card";
import {
  SubjectCard,
  SubjectCardSkeleton,
} from "@/components/dashboard/subject-card";
import { ProgressCharts } from "@/components/dashboard/progress-charts";
import { NoteItem } from "@/components/dashboard/note-item";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { MockNote } from "@/app/dashboard/mock-data";
import { useSubjects } from "@/components/dashboard/use-subjects";
import {
  CreateNote,
  type NoteWithSubjectName,
} from "@/components/notes/create-note";
import {
  MOCK_CONTINUE_ITEMS,
  MOCK_NOTES,
  MOCK_STATS,
} from "./mock-data";

function SectionHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {children}
    </div>
  );
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("Student");
  const [greeting, setGreeting] = useState("Good afternoon, Student");
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [notes, setNotes] = useState<NoteWithSubjectName[]>(
    MOCK_NOTES as NoteWithSubjectName[]
  );

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const displayName = stored || "Student";
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const frame = window.requestAnimationFrame(() => {
      setName(displayName);
      setGreeting(`${part}, ${displayName}`);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleNewNote = () => setShowCreateNote(true);

  const handleNoteCreated = (note: NoteWithSubjectName) => {
    setNotes((previous) => [note, ...previous]);
  };

  const {
    state: subjectsState,
    reload: reloadSubjects,
  } = useSubjects();

  const statIcons = [Clock, Flame, BookOpen, FileText];

  return (
    <DashboardShell name={name}>
      <section aria-labelledby="greeting-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1
              id="greeting-heading"
              className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50"
            >
              {greeting}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Keep building momentum. A little progress today goes a long way.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewNote}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-accent-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New note
          </button>
        </div>
      </section>

      <section aria-label="Overview statistics" className="mt-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {MOCK_STATS.map((stat, index) => (
            <StatCard
              key={stat.id}
              icon={statIcons[index]}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              sample
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="continue-heading" className="mt-10">
        <SectionHeading title="Continue studying">
          {/* TODO(dashboard): show only items the student actually left in progress. */}
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Sample</span>
        </SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          {MOCK_CONTINUE_ITEMS.map((item) => (
            <ContinueCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section aria-label="AI Tutor" className="mt-10">
        <AITutorCard />
      </section>

      <section aria-labelledby="subjects-heading" className="mt-10">
        <SectionHeading title="Your subjects">
          {subjectsState.status === "ready" ? (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {subjectsState.subjects.length}{" "}
              {subjectsState.subjects.length === 1 ? "subject" : "subjects"}
            </span>
          ) : null}
        </SectionHeading>
        {subjectsState.status === "loading" ? (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((index) => (
              <SubjectCardSkeleton key={index} />
            ))}
          </div>
        ) : subjectsState.status === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load your subjects"
            description={subjectsState.message}
            cta={{
              label: subjectsState.unauthorized ? "Sign in again" : "Try again",
              onClick: () => {
                if (subjectsState.unauthorized) {
                  router.push("/signin");
                  return;
                }
                void reloadSubjects();
              },
            }}
          />
        ) : subjectsState.subjects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {subjectsState.subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="Add your first subject to start tracking progress across your studies."
            cta={{
              label: "Add a subject",
              onClick: () => router.push("/dashboard/subjects"),
            }}
          />
        )}
      </section>

      <section aria-label="Progress" className="mt-10">
        <SectionHeading title="Progress" />
        <ProgressCharts />
      </section>

      <section aria-labelledby="notes-heading" className="mt-10">
        <SectionHeading title="Recent notes" />
        {notes.length > 0 ? (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {notes.map((note) => (
              <NoteItem key={note.id} note={toMockNote(note)} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={FileText}
            title="No notes yet"
            description="Upload your first study note and it will appear here, ready to review."
            cta={{ label: "New note", onClick: handleNewNote }}
          />
        )}
      </section>

      <CreateNote
        open={showCreateNote}
        onClose={() => setShowCreateNote(false)}
        onCreated={handleNoteCreated}
      />
    </DashboardShell>
  );
}
