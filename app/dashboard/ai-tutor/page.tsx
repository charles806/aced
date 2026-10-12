"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Reveal } from "@/components/marketing/reveal";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TutorChat, TutorNotePicker } from "@/components/tutor/tutor-chat";

function TutorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [name, setName] = useState("Student");
  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    const frame = window.requestAnimationFrame(() => {
      if (stored) setName(stored);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const q = searchParams.get("noteId");
    setNoteId(q && q.trim() !== "" ? q.trim() : null);
  }, [searchParams]);

  const handleNoteChange = (next: string | null) => {
    setNoteId(next);

    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    if (next) {
      url.searchParams.set("noteId", next);
    } else {
      url.searchParams.delete("noteId");
    }

    window.history.replaceState(null, "", url.toString());
  };

  return (
    <DashboardShell name={name}>
      <Reveal direction="up">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
              AI Tutor
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Ask about the note you’re studying. Answers stay grounded in its content.
            </p>
          </div>
          <TutorNotePicker noteId={noteId} onNoteChange={handleNoteChange} />
        </div>
      </Reveal>

      <Reveal direction="up" delay={0.05}>
        <div className="mt-6 flex min-h-[32rem] flex-col">
          <TutorChat noteId={noteId} studentName={name} />
        </div>
      </Reveal>
    </DashboardShell>
  );
}

export default function AITutorPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell name="Student">
          <div className="flex min-h-[32rem] flex-col items-center justify-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-500 dark:bg-accent-500/10 dark:text-accent-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Loading tutor…</p>
          </div>
        </DashboardShell>
      }
    >
      <TutorPageContent />
    </Suspense>
  );
}