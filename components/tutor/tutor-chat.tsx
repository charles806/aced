"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  History,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  useNotes,
  withSubjectNames,
} from "@/components/dashboard/use-notes";
import { useSubjects } from "@/components/dashboard/use-subjects";
import { cx } from "@/components/marketing/lib/cx";
import { PulseDot } from "@/components/dashboard/micro-motion";
import { TutorComposer } from "@/components/tutor/tutor-composer";
import { TutorMessage, type TutorRole } from "@/components/tutor/tutor-message";
import {
  readTutorStream,
  tutorFailureMessage,
} from "@/app/lib/ai/tutor-events";

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

type ConversationListItem = {
  id: string;
  noteId: string | null;
  title: string;
  preview: string;
  lastMessageAt: string;
  updatedAt: string;
};

const MAX_SCROLL_DISTANCE_PX = 96;

function randomId(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function TutorChat({
  noteId,
  studentName,
}: {
  noteId: string | null;
  studentName: string;
}) {
  const [phase, setPhase] = useState<TutorPhase>("idle");
  const [messages, setMessages] = useState<TutorMessageRecord[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hydrationAbortRef = useRef<AbortController | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  const isAtBottomRef = useRef(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const hydratedIdRef = useRef<string | null>(null);

  // Conversation history drawer
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<ConversationListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/ai/tutor/conversations?limit=20");
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg = tutorFailureMessage(res.status, payload);
        setHistoryError(msg);
        return;
      }
      const data = (await res.json()) as { conversations: ConversationListItem[] };
      setHistoryItems(data.conversations ?? []);
    } catch {
      setHistoryError("Couldn't load conversations.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showHistory) void fetchHistory();
  }, [showHistory, fetchHistory]);

  const handleOpenConversation = (id: string, cNoteId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("conversationId", id);
    if (cNoteId) params.set("noteId", cNoteId);
    else params.delete("noteId");
    router.replace(`?${params.toString()}`, { scroll: false });
    setShowHistory(false);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/tutor/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(tutorFailureMessage(res.status, payload));
      }
      setHistoryItems((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        // Clear current chat if we deleted the open one
        handleStartNewChat();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't delete conversation.";
      setHistoryError(msg);
    }
  };

  const handleStartNewChat = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("conversationId");
    router.replace(`?${params.toString()}`, { scroll: false });
    setConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setPhase("idle");
    setCurrentInput(null);
    hydratedIdRef.current = null;
    abortControllerRef.current?.abort();
    hydrationAbortRef.current?.abort();
  }, [router, searchParams]);

  // Note switch: abort in-flight GET or stream, clear state, reset hydration guard
  const prevNoteIdRef = useRef<string | null>(noteId);
  useEffect(() => {
    if (prevNoteIdRef.current !== noteId) {
      // Abort any in-flight stream or hydration
      abortControllerRef.current?.abort();
      try {
        streamReaderRef.current?.cancel();
      } catch {}
      abortControllerRef.current = null;
      hydrationAbortRef.current?.abort();
      hydrationAbortRef.current = null;

      setConversationId(null);
      setMessages([]);
      setErrorMessage(null);
      setPhase("idle");
      setCurrentInput(null);
      hydratedIdRef.current = null;
      prevNoteIdRef.current = noteId;
    }
  }, [noteId]);

  // Also abort stream when conversationId changes or on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      hydrationAbortRef.current?.abort();
    };
  }, []);

  // Sync conversationId to URL via router.replace (single writer for conversationId)
  useEffect(() => {
    const currentInUrl = searchParams.get("conversationId");
    if (conversationId) {
      if (currentInUrl === conversationId) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("conversationId", conversationId);
      router.replace(`?${params.toString()}`, { scroll: false });
    } else {
      if (!currentInUrl) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("conversationId");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
    // Intentionally only depend on conversationId to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Re-hydrate an existing conversation from the URL
  useEffect(() => {
    const qConversationId = searchParams.get("conversationId");
    if (!qConversationId) {
      // No id in URL — if we had hydrated something before, clear it
      if (hydratedIdRef.current) {
        hydratedIdRef.current = null;
        setConversationId(null);
        setMessages([]);
        setPhase("idle");
        setErrorMessage(null);
      }
      return;
    }

    if (hydratedIdRef.current === qConversationId) {
      return;
    }

    // New id — abort previous hydration
    hydrationAbortRef.current?.abort();
    const controller = new AbortController();
    hydrationAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    setPhase("loading");
    setErrorMessage(null);
    setMessages([]);
    setConversationId(null);

    void (async () => {
      try {
        const params = new URLSearchParams({ conversationId: qConversationId });
        if (noteId) params.set("noteId", noteId);

        const res = await fetch(`/api/ai/tutor?${params.toString()}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          setErrorMessage(tutorFailureMessage(res.status, payload));
          setPhase("error");
          return;
        }

        const data = (await res.json()) as HistoryResponse;

        if (controller.signal.aborted) return;

        hydratedIdRef.current = data.conversationId;
        setConversationId(data.conversationId);

        const mapped: TutorMessageRecord[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));

        setMessages(mapped);
        setPhase("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        if (isAbort) {
          setErrorMessage("Loading timed out. Please try again.");
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Couldn't load conversation.");
        }
        setPhase("error");
      } finally {
        clearTimeout(timeoutId);
        if (hydrationAbortRef.current === controller) {
          hydrationAbortRef.current = null;
        }
      }
    })();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchParams, noteId]);

  // Track scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
      const atBottom = distance < MAX_SCROLL_DISTANCE_PX;
      isAtBottomRef.current = atBottom;
      setScrolledUp(!atBottom);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || scrolledUp) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, phase, scrolledUp]);

  // Visual viewport handling for 320px composer
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      if (isAtBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handler);
      return () => window.visualViewport?.removeEventListener("resize", handler);
    }
  }, []);

  const scrollToBottomNow = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setScrolledUp(false);
    isAtBottomRef.current = true;
  };

  const handleSend = async () => {
    const text = composerValue.trim();
    if (text.length === 0 || phase === "streaming") return;

    // Mark hydration as done BEFORE streaming so meta doesn't re-trigger hydration
    hydratedIdRef.current = conversationId ?? hydratedIdRef.current;

    const userMsgId = randomId("user");
    const assistantMsgId = randomId("assistant");

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
    // Abort on noteId/conversationId change handled via effect; also abort on unmount

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

      // Keep reader reference to allow cancel on note switch
      // Note: readTutorStream will handle idle timeout
      let gotTerminal = false;
      await readTutorStream(
        res,
        (event) => {
          if (controller.signal.aborted) return;
          if (event.type === "done" || event.type === "error") {
            gotTerminal = true;
          }

          if (event.type === "meta") {
            hydratedIdRef.current = event.conversationId;
            setConversationId(event.conversationId);
            return;
          }

          if (event.type === "delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content + event.text } : m,
              ),
            );
            return;
          }

          if (event.type === "done") {
            setConversationId(event.conversationId);
            hydratedIdRef.current = event.conversationId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content, streaming: false } : m,
              ),
            );
            setPhase("idle");
            setCurrentInput(null);
            abortControllerRef.current = null;
            return;
          }

          if (event.type === "error") {
            setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
            setErrorMessage(event.error);
            setPhase("error");
            setCurrentInput(text);
            abortControllerRef.current = null;
            return;
          }
        },
        { signal: controller.signal },
      );

      if (!gotTerminal && !controller.signal.aborted) {
        throw new Error("The Tutor stopped responding. Please try again");
      }
    } catch (err) {
      if (controller.signal.aborted) {
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
        cta={{
          label: "Browse notes",
          onClick: () => router.push("/dashboard/notes"),
        }}
      />
    );
  }

  const isBusy = phase === "streaming" || phase === "loading";
  const streamingBubbleActive = messages.some(
    (m) => m.role === "assistant" && m.streaming,
  );

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      {/* History drawer/sidebar */}
      <div
        className={cx(
          "flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
          "lg:w-72 lg:shrink-0",
          showHistory ? "flex" : "hidden lg:flex",
          "max-h-64 lg:max-h-none lg:h-full overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <History className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            Recent chats
          </h2>
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Close history"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" aria-hidden="true" />
            </div>
          ) : historyError ? (
            <p className="px-2 py-3 text-xs text-red-600 dark:text-red-400">{historyError}</p>
          ) : historyItems.length === 0 ? (
            <p className="px-2 py-3 text-xs text-zinc-500 dark:text-zinc-400">No chats yet.</p>
          ) : (
            <ul className="space-y-1">
              {historyItems.map((c) => (
                <li
                  key={c.id}
                  className={cx(
                    "group flex items-start justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition",
                    c.id === conversationId
                      ? "bg-accent-50 dark:bg-accent-500/10"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenConversation(c.id, c.noteId)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{c.title}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{c.preview || "No messages"}</p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {new Date(c.lastMessageAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteConversation(c.id)}
                    aria-label="Delete conversation"
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleStartNewChat}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            New chat
          </button>
        </div>
      </div>

      <section
        aria-label="AI Tutor chat"
        className="relative flex h-full min-h-[28rem] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-20px_rgba(24,24,27,0.18)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_24px_-20px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setShowHistory((v) => !v);
              if (!showHistory) void fetchHistory();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            {showHistory ? "Hide history" : "History"}
          </button>
          <button
            type="button"
            onClick={handleStartNewChat}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            New chat
          </button>
        </div>

        <div
          ref={scrollRef}
          role="log"
          aria-busy={isBusy}
          className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5"
        >
          {messages.length === 0 && phase !== "loading" ? (
            <div className="flex h-full flex-col items-center justify-center px-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-500 dark:bg-accent-500/10 dark:text-accent-400">
                <BookOpen
                  className="h-5 w-5"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Ask about this note
              </h2>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                The ACED Tutor uses only this note as its source. Ask for an
                explanation, examples, or to clarify anything that’s unclear.
              </p>
            </div>
          ) : null}

          {messages.map((m) => (
            <TutorMessage
              key={m.id}
              role={m.role}
              content={m.content}
              streaming={m.streaming}
              studentName={studentName}
            />
          ))}

          {phase === "loading" ? (
            <div className="flex items-center justify-center py-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
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
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
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
                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Start new chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {scrolledUp && !streamingBubbleActive ? (
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
          <div className="flex items-center justify-center gap-1.5 border-t border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300" aria-live="polite">
            <PulseDot className="h-1.5 w-1.5" />
            Generating response
            <button
              type="button"
              onClick={handleAbort}
              className="ml-2 inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
          disabled={phase === "loading"}
          noteTitle={noteId ? "" : "this note"}
        />
      </section>
    </div>
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
  const subjects =
    subjectsState.status === "ready" ? subjectsState.subjects : [];
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
          "w-full appearance-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-accent-400 dark:focus:ring-accent-500/20",
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </span>
    </div>
  );
}
