"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/marketing/reveal";
import { apiRequest } from "@/app/lib/api-client";
import { useNotes, withSubjectNames, type NoteWithSubjectName } from "@/components/dashboard/use-notes";
import { useSubjects } from "@/components/dashboard/use-subjects";
import { cx } from "@/components/marketing/lib/cx";
import { PulseDot } from "@/components/dashboard/micro-motion";
import { TutorComposer } from "@/components/tutor/tutor-composer";
import { TutorMessage, type TutorRole } from "@/components/tutor/tutor-message";
import { readTutorStream, tutorFailureMessage } from "@/app/lib/ai/tutor-events";

type TutorMessageRecord = {
  id: string;
  role: TutorRole;
  content: string;
  streaming?: boolean;
};

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type HistoryResponse = {
  conversationId: string;
  noteId: string | null;
  messages: Message[];
};

type TutorPhase = "idle" | "loading" | "streaming" | "error";

const MAX_SCROLL_DISTANCE_PX = 96;

function messageKey(role: TutorRole, index: number): string {
  return `${role}-${index}`;
}

export function TutorChat({ noteId, studentName }: { noteId: string | null; studentName: string }) {
  const [phase, setPhase] = useState<TutorPhase>("idle");
  const [messages, setMessages] = useState<TutorMessageRecord[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolledUpRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const searchParams = useSearchParams();
  const didHydrateRef = useRef(false);

  // Re-hydrate an existing conversation from the URL (refresh/reopen case).
  useEffect(() => {
    const qConversationId = searchParams.get("conversationId");

    if (!qConversationId || didHydrateRef.current) {
      return;
    }

    didHydrateRef.current = true;
    setPhase("loading");
    setErrorMessage(null);
    setMessages([]);
    setConversationId(null);

    void (async () => {
      const params = new URLSearchParams({ conversationId: qConversationId });
      if (noteId) params.set("noteId", noteId);

      const res = await fetch(`/api/ai/tutor?${params.toString()}`);

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setErrorMessage(tutorFailureMessage(res.status, payload));
        setPhase("error");
        return;
      }

      const data = (await res.json()) as HistoryResponse;

      setConversationId(data.conversationId);

      const mapped: TutorMessageRecord[] = data.messages.map((m, idx) => ({
        id: `hist-${m.id}-${idx}`,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

      setMessages(mapped);
      setPhase("idle");
    })();
  }, [searchParams, noteId]);

  // Keep the URL in sync with the current conversation. This avoids creating a
  // new conversation on refresh and lets the user share the link later.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    if (conversationId) {
      url.searchParams.set("conversationId", conversationId);
    } else {
      url.searchParams.delete("conversationId");
    }

    if (noteId) {
      url.searchParams.set("noteId", noteId);
    } else {
      url.searchParams.delete("noteId");
    }

    window.history.replaceState(null, "", url.toString());
  }, [conversationId, noteId]);

  // Track whether the user has scrolled away from the bottom (auto-scroll only
  // when pinned).
  useEffect(() => {
    const el = scrollRef.current;

    if (!el) return;

    const handleScroll = () => {
      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
      const atBottom = distance < MAX_SCROLL_DISTANCE_PX;

      isAtBottomRef.current = atBottom;
      scrolledUpRef.current = !atBottom;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to the latest message while the transcript is pinned, including
  // when new delta chunks arrive.
  useEffect(() => {
    const el = scrollRef.current;

    if (!el || scrolledUpRef.current) return;

    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight;
    };

    // rAF lets the DOM paint the new text before jumping to bottom.
    requestAnimationFrame(scrollToBottom);
  }, [messages, phase]);

  const scrollToBottomNow = () => {
    const el = scrollRef.current;

    if (!el) return;

    el.scrollTop = el.scrollHeight;
    scrolledUpRef.current = false;
    isAtBottomRef.current = true;
  };

  const handleSend = async () => {
    const text = composerValue.trim();

    if (text.length === 0 || phase === "streaming") return;

    // Optimistically push the user message.
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: text },
      { id: assistantMsgId, role: "assistant", content: "", streaming: true },
    ]);

    setComposerValue("");
    setCurrentInput(text);
    setPhase("streaming");
    setErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId,
          message: text,
          ...(conversationId ? { conversationId } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        throw new Error(tutorFailureMessage(res.status, payload));
      }

      await readTutorStream(res, (event) => {
        if (event.type === "meta") {
          setConversationId(event.conversationId);
          return;
        }

        if (event.type === "delta") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content + event.text } : m
            )
          );
          return;
        }

        if (event.type === "done") {
          setConversationId(event.conversationId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content, streaming: false } : m
            )
          );
          setPhase("idle");
          setCurrentInput(null);
          abortControllerRef.current = null;
          return;
        }

        if (event.type === "error") {
          // Replace the streaming bubble with a failed state: clear its content
          // so the banner conveys the error and the user can retry.
          setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
          setErrorMessage(event.error);
          setPhase("error");
          setCurrentInput(text);
          abortControllerRef.current = null;
          return;
        }
      });

      // If the stream ended without a terminal event, we rely on the UI state
      // already set above. The browser reader closing is expected.
    } catch (err) {
      if (controller.signal.aborted) {
        // User cancelled or aborted: remove the placeholder bubbles so the
        // transcript doesn't keep a half-written assistant reply.
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
        setPhase("idle");
        setCurrentInput(null);
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
        setErrorMessage(msg);
        setPhase("error");
        setCurrentInput(text);
      }
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setPhase("idle");

    if (currentInput && currentInput.trim().length > 0) {
      // Re-send the previous question without changing conversationId. The
      // backend will append to the same conversation if it exists.
      setComposerValue(currentInput);
      setCurrentInput(null);
    }
  };

  const handleAbort = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  };

  if (!noteId) {
    return (
      <EmptyState
        icon={FileText}
        title="Pick a note first"
        description="Choose a note from the header to start chatting with the ACED Tutor."
        cta={{ label: "Browse notes", onClick: () => (window.location.href = "/dashboard/notes") }}
      />
    );
  }

  const isBusy = phase === "streaming" || phase === "loading";
  const streamingBubbleActive = messages.some((m) => m.role === "assistant" && m.streaming);

  return (
    <section
      aria-label="AI Tutor chat"
      className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-20px_rgba(24,24,27,0.18)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_24px_-20px_rgba(0,0,0,0.6)]"
    >
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-busy={isBusy}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5"
      >
        {messages.length === 0 && phase !== "loading" ? (
          <div className="flex h-full flex-col items-center justify-center px-3 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-500 dark:bg-accent-500/10 dark:text-accent-400">
              <BookOpen className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Ask about this note
            </h2>
            <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              The ACED Tutor uses only this note as its source. Ask for an explanation, examples, or to clarify anything that’s unclear.
            </p>
          </div>
        ) : null}

        {messages.map((m, index) => (
          <TutorMessage
            key={messageKey(m.role, index)}
            role={m.role}
            content={m.content}
            streaming={m.streaming}
            studentName={studentName}
          />
        ))}

        {phase === "loading" ? (
          <div className="flex items-center justify-center py-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Loading conversation…
            </span>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="mx-auto max-w-[92%] rounded-xl border border-red-300 bg-red-50 px-3.5 py-3 text-sm text-red-700 shadow-sm sm:max-w-[85%] dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="break-words">{errorMessage}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {scrolledUpRef.current && !streamingBubbleActive ? (
        <button
          type="button"
          onClick={scrollToBottomNow}
          className="absolute bottom-24 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Jump to latest
        </button>
      ) : null}

      {phase === "streaming" ? (
        <div className="flex items-center justify-center gap-1.5 border-t border-zinc-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-zinc-500 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-400">
          <PulseDot className="h-1.5 w-1.5" />
          Generating response
          <button
            type="button"
            onClick={handleAbort}
            className="ml-2 inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Stop
          </button>
        </div>
      ) : null}

      <TutorComposer
        value={composerValue}
        onChange={setComposerValue}
        onSubmit={() => void handleSend()}
        busy={phase === "streaming"}
        disabled={!noteId || phase === "loading"}
        noteTitle={noteId ? "" : "this note"}
      />
    </section>
  );
}

export function TutorNotePicker({
  noteId,
  onNoteChange,
}: {
  noteId: string | null;
  onNoteChange: (id: string | null) => void;
}) {
  const { state: subjectsState } = useSubjects();
  const { state: notesState } = useNotes();
  const subjects = subjectsState.status === "ready" ? subjectsState.subjects : [];
  const notes = notesState.status === "ready" ? notesState.notes : [];
  const displayNotes = withSubjectNames(notes, subjects);

  return (
    <div className="relative max-w-full sm:max-w-xs">
      <label htmlFor="tutor-note-picker" className="sr-only">
        Choose a note to study
      </label>
      <select
        id="tutor-note-picker"
        value={noteId ?? ""}
        onChange={(event) => {
          const v = event.target.value;
          onNoteChange(v === "" ? null : v);
        }}
        className={cx(
          "w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-400 dark:focus:ring-accent-500/20"
        )}
      >
        <option value="">Choose a note…</option>
        {displayNotes.map((note) => (
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </span>
    </div>
  );
}