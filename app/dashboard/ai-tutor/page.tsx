"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Reveal } from "@/components/marketing/reveal";
import { TutorChat, TutorNotePicker } from "@/components/tutor/tutor-chat";

function TutorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [name, setName] = useState("Student");

  // Derive noteId directly from URL — avoids setState-in-effect and keeps
  // this component the single writer of noteId (TutorChat writes conversationId).
  const noteIdParam = searchParams.get("noteId");
  const noteId = noteIdParam && noteIdParam.trim() !== "" ? noteIdParam.trim() : null;

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sv-name") : null;
    if (stored) setName(stored);
  }, []);

  // This component is the single writer of `noteId`. TutorChat is the single
  // writer of `conversationId` (it clears it on a note switch). Keeping each
  // param to exactly one owner avoids replace/replace races and stray 400s.
  const handleNoteChange = (next: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("noteId", next);
    } else {
      params.delete("noteId");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
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
