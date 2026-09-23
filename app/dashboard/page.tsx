"use client";

import { useEffect, useRef, useState } from "react";
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
import { AITutorCard } from "@/components/dashboard/ai-tutor-card";
import {
  SubjectCard,
  SubjectCardSkeleton,
} from "@/components/dashboard/subject-card";
import { ProgressCharts } from "@/components/dashboard/progress-charts";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StudyTimer } from "@/components/dashboard/study-timer";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { useProgress } from "@/components/dashboard/use-progress";
import { formatDuration } from "@/app/lib/format";
import { useSubjects } from "@/components/dashboard/use-subjects";
import { useNotes, withSubjectNames } from "@/components/dashboard/use-notes";
import { NotesSection } from "@/components/notes/notes-section";

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

export default function DashboardPage() {
  const router = useRouter();
  const notesRef = useRef<{ openCreate: () => void }>(null);
  const [name, setName] = useState("Student");
  const [greeting, setGreeting] = useState("Good afternoon, Student");

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const displayName = stored || "Student";
    const hour = new Date().getHours();
    const part =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    const frame = window.requestAnimationFrame(() => {
      setName(displayName);
      setGreeting(`${part}, ${displayName}`);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const { state: subjectsState, reload: reloadSubjects } = useSubjects();

  const { state: notesState, reload: reloadNotes, setNotes } = useNotes();

  const { state: progressState, reload: reloadProgress } = useProgress();

  const readySubjects =
    subjectsState.status === "ready" ? subjectsState.subjects : [];
  const readyNotes = notesState.status === "ready" ? notesState.notes : [];
  const displayNotes = withSubjectNames(readyNotes, readySubjects);

  const handleNewNote = () => notesRef.current?.openCreate();

  const handleNoteUpdated = (note: (typeof displayNotes)[number]) => {
    setNotes((previous) =>
      previous.map((item) => (item.id === note.id ? note : item)),
    );
  };

  const handleNoteDeleted = (noteId: string) => {
    setNotes((previous) => previous.filter((item) => item.id !== noteId));
  };

  const statCards = [
    {
      id: "studyTime",
      icon: Clock,
      label: "Today's study time",
      value:
        progressState.status === "ready"
          ? formatDuration(progressState.stats.todayMs / 1000)
          : "—",
      hint:
        progressState.status === "ready"
          ? "today"
          : progressState.status === "error"
            ? "Unavailable"
            : "",
      sample: false,
      skeleton: progressState.status === "loading",
    },
    {
      id: "streak",
      icon: Flame,
      label: "Day streak",
      value:
        progressState.status === "ready"
          ? String(progressState.stats.streakDays)
          : "—",
      hint:
        progressState.status === "ready"
          ? progressState.stats.streakDays === 1
            ? "day in a row"
            : "days in a row"
          : progressState.status === "error"
            ? "Unavailable"
            : "",
      sample: false,
      skeleton: progressState.status === "loading",
    },
    {
      id: "subjects",
      icon: BookOpen,
      label: "Active subjects",
      value: String(readySubjects.length),
      hint: "in progress",
      sample: false,
      skeleton: subjectsState.status === "loading",
    },
    {
      id: "notes",
      icon: FileText,
      label: "Notes",
      value: String(readyNotes.length),
      hint: "across subjects",
      sample: false,
      skeleton: notesState.status === "loading",
    },
  ];

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
          {statCards.map((stat) => (
            <StatCard
              key={stat.id}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              sample={stat.sample}
              skeleton={stat.skeleton}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="study-timer-title" className="mt-10">
        <StudyTimer
          subjects={readySubjects}
          onSessionSaved={() => void reloadProgress()}
          onSignIn={() => router.push("/signin")}
        />
      </section>

      <section aria-label="AI Tutor" className="mt-10">
        <AITutorCard />
      </section>

      <section
        aria-labelledby="subjects-heading"
        className="mt-10 cursor-pointer"
      >
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
        {progressState.status === "loading" ? (
          <div className="grid gap-6 sm:grid-cols-2" aria-hidden="true">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mt-1.5 h-3 w-36 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="mt-6 h-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : progressState.status === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load your progress"
            description={progressState.message}
            cta={{
              label: progressState.unauthorized ? "Sign in again" : "Try again",
              onClick: () => {
                if (progressState.unauthorized) {
                  router.push("/signin");
                  return;
                }
                void reloadProgress();
              },
            }}
          />
        ) : (
          <ProgressCharts stats={progressState.stats} />
        )}
      </section>

      <section aria-labelledby="activity-heading" className="mt-10">
        <SectionHeading title="Recent activity" />
        {progressState.status === "loading" ? (
          <ul
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((index) => (
              <li
                key={index}
                className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5 last:border-b-0 dark:border-zinc-800"
              >
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-3 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              </li>
            ))}
          </ul>
        ) : progressState.status === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load your activity"
            description={progressState.message}
            cta={{
              label: progressState.unauthorized ? "Sign in again" : "Try again",
              onClick: () => {
                if (progressState.unauthorized) {
                  router.push("/signin");
                  return;
                }
                void reloadProgress();
              },
            }}
          />
        ) : (
          <ActivityFeed items={progressState.activity} />
        )}
      </section>

      <section aria-labelledby="notes-heading" className="mt-10">
        <SectionHeading title="Recent notes" />
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
      </section>
    </DashboardShell>
  );
}
