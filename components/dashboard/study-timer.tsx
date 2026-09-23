"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Square } from "lucide-react";
import { apiRequest } from "@/app/lib/api-client";
import { formatClock, formatDuration } from "@/app/lib/format";
import type { Subject } from "@/components/dashboard/use-subjects";

const TIMER_STORAGE_KEY = "aced-study-timer";
const NO_SUBJECT_VALUE = "__none__";
const TICK_MS = 1000;

type StudyTimerSession = {
  id: string;
  startedAt: string;
  subjectId: string | null;
};

type TimerStatus = "idle" | "running" | "paused";

type StudyTimerNotice =
  | { kind: "success" | "error"; message: string }
  | null;

type StoredTimer = {
  id: string;
  startedAt: string;
  subjectId: string | null;
  accumulatedMs: number;
};

type StudyTimerProps = {
  subjects: Subject[];
  onSignIn?: () => void;
  onSessionSaved?: () => void;
};

function readStoredTimer(): StoredTimer | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredTimer>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.startedAt !== "string"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      startedAt: parsed.startedAt,
      subjectId:
        typeof parsed.subjectId === "string" ? parsed.subjectId : null,
      accumulatedMs:
        typeof parsed.accumulatedMs === "number" ? parsed.accumulatedMs : 0,
    };
  } catch {
    return null;
  }
}

export function StudyTimer({
  subjects,
  onSignIn,
  onSessionSaved,
}: StudyTimerProps) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [session, setSession] = useState<StudyTimerSession | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [subjectValue, setSubjectValue] = useState(NO_SUBJECT_VALUE);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<StudyTimerNotice>(null);

  const accumulatedMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const sessionRef = useRef<StudyTimerSession | null>(null);
  const intervalRef = useRef<number | null>(null);

  const persist = (accumulatedMs: number) => {
    const current = sessionRef.current;
    if (!current) return;

    try {
      window.localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          id: current.id,
          startedAt: current.startedAt,
          subjectId: current.subjectId,
          accumulatedMs,
        } satisfies StoredTimer)
      );
    } catch {
      // Storage can be unavailable; the active session simply isn't persisted.
    }
  };

  const clearPersisted = () => {
    try {
      window.localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const currentMs = (): number => {
    const segment =
      status === "running" && segmentStartRef.current !== null
        ? Date.now() - segmentStartRef.current
        : 0;
    return accumulatedMsRef.current + segment;
  };

  const stopTicking = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTicking = () => {
    stopTicking();
    intervalRef.current = window.setInterval(() => {
      setElapsedMs(currentMs());
      persist(accumulatedMsRef.current);
    }, TICK_MS);
  };

  useEffect(() => {
    const stored = readStoredTimer();

    if (stored) {
      sessionRef.current = {
        id: stored.id,
        startedAt: stored.startedAt,
        subjectId: stored.subjectId,
      };
      accumulatedMsRef.current = stored.accumulatedMs;
      segmentStartRef.current = null;
      setSession(sessionRef.current);
      setStatus("paused");
      setElapsedMs(stored.accumulatedMs);
      setSubjectValue(stored.subjectId ?? NO_SUBJECT_VALUE);
    }

    return () => stopTicking();
  }, []);

  const handleStart = async () => {
    if (busy || status !== "idle") return;

    const selectedSubjectId =
      subjectValue === NO_SUBJECT_VALUE ? null : subjectValue;

    setBusy(true);
    setNotice(null);

    const result = await apiRequest<{ session: StudyTimerSession }>(
      "/api/study-sessions",
      {
        method: "POST",
        json: selectedSubjectId ? { subjectId: selectedSubjectId } : {},
      }
    );

    setBusy(false);

    if (!result.ok) {
      if (result.failure.kind === "unauthorized") {
        onSignIn?.();
        return;
      }

      setNotice({
        kind: "error",
        message: "We couldn't start your session. Please try again.",
      });
      return;
    }

    const next = result.data.session;
    sessionRef.current = next;
    accumulatedMsRef.current = 0;
    segmentStartRef.current = Date.now();

    setSession(next);
    setStatus("running");
    setElapsedMs(0);
    persist(0);
    startTicking();
  };

  const handlePause = () => {
    if (status !== "running") return;

    const now = Date.now();
    accumulatedMsRef.current += now - (segmentStartRef.current ?? now);
    segmentStartRef.current = null;
    stopTicking();

    setStatus("paused");
    setElapsedMs(accumulatedMsRef.current);
    persist(accumulatedMsRef.current);
  };

  const handleResume = () => {
    if (status !== "paused" || !session) return;

    segmentStartRef.current = Date.now();

    setStatus("running");
    persist(accumulatedMsRef.current);
    startTicking();
  };

  const handleStop = async () => {
    const current = sessionRef.current;

    if (!current || busy) return;

    const activeMs = currentMs();
    const wallMs = Math.max(
      0,
      Date.now() - new Date(current.startedAt).getTime()
    );
    const pausedMs = Math.max(0, Math.round(wallMs - activeMs));

    setBusy(true);
    setNotice(null);

    const result = await apiRequest<{ session: StudyTimerSession }>(
      `/api/study-sessions/${current.id}`,
      { method: "PATCH", json: { pausedMs } }
    );

    setBusy(false);

    if (!result.ok) {
      if (result.failure.kind === "unauthorized") {
        onSignIn?.();
        return;
      }

      setNotice({
        kind: "error",
        message: "We couldn't save this session. Please try stopping again.",
      });
      return;
    }

    accumulatedMsRef.current = 0;
    segmentStartRef.current = null;
    sessionRef.current = null;
    stopTicking();
    clearPersisted();

    setSession(null);
    setStatus("idle");
    setElapsedMs(0);
    setNotice({
      kind: "success",
      message: `Session saved — ${formatDuration(activeMs / 1000)}`,
    });
    onSessionSaved?.();
  };

  const selectedSubjectName = session?.subjectId
    ? subjects.find((s) => s.id === session.subjectId)?.name ?? "Subject"
    : null;

  return (
    <section
      aria-labelledby="study-timer-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2
            id="study-timer-title"
            className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Study timer
          </h2>

          <p
            role="timer"
            aria-live="polite"
            className={`mt-3 font-display text-4xl tabular-nums tracking-tight ${
              status === "running"
                ? "text-accent-600 dark:text-accent-400"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {formatClock(elapsedMs / 1000)}
          </p>

          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {status === "idle" && "Pick a subject, then start focusing."}
            {status === "running" && "Focus session in progress."}
            {status === "paused" &&
              (session
                ? "Session paused. Resume or stop to save it."
                : "Ready when you are.")}
            {selectedSubjectName ? ` · ${selectedSubjectName}` : ""}
          </p>
        </div>

        <div className="shrink-0">
          {status === "idle" ? (
            <div className="flex flex-col gap-3 sm:items-end">
              <label className="sr-only" htmlFor="study-timer-subject">
                Subject
              </label>
              <select
                id="study-timer-subject"
                value={subjectValue}
                onChange={(event) => setSubjectValue(event.target.value)}
                disabled={busy}
                className="max-w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-500/10 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value={NO_SUBJECT_VALUE}>No subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
                Start
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {status === "running" ? (
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:opacity-60"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Resume
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleStop()}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Square className="h-4 w-4" aria-hidden="true" />
                )}
                Stop
              </button>
            </div>
          )}
        </div>
      </div>

      {notice ? (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {notice.message}
        </div>
      ) : null}
    </section>
  );
}