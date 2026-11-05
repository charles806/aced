"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/app/lib/api-client";
import { studyTimerStorageKey } from "@/app/lib/study-timer-storage";
import type { Subject } from "@/components/dashboard/use-subjects";

type StudyTimerSession = {
  id: string;
  startedAt: string;
  subjectId: string | null;
};

type TimerStatus = "idle" | "running" | "paused";

type StoredTimer = {
  id: string;
  startedAt: string;
  subjectId: string | null;
  accumulatedMs: number;
};

type StudyTimerContextType = {
  status: TimerStatus;
  elapsedMs: number;
  session: StudyTimerSession | null;
  start: (subjectId: string | null) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  userId: string | null;
};

const StudyTimerContext = createContext<StudyTimerContextType | null>(null);

export function StudyTimerProvider({ children, subjects }: { children: React.ReactNode; subjects: Subject[] }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [session, setSession] = useState<StudyTimerSession | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const accumulatedMsRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const storageKey = studyTimerStorageKey(userId);

  const persist = (accumulatedMs: number) => {
    if (!session) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        id: session.id,
        startedAt: session.startedAt,
        subjectId: session.subjectId,
        accumulatedMs,
      }));
    } catch {}
  };

  const clearPersisted = () => {
    try { window.localStorage.removeItem(storageKey); } catch {}
  };

  const currentMs = () => {
    const segment = status === "running" && segmentStartRef.current !== null
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
    }, 1000);
  };

  // Load user
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setUserId(data.user?.id ?? null);
        }
      } catch {}
      if (!cancelled) setUserId(null);
    })();
    return () => { cancelled = true; };
  }, []);

  const sessionRef = useRef<StudyTimerSession | null>(null);

  // Restore from storage
  useEffect(() => {
    if (!userId) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredTimer;
      if (parsed.id && parsed.startedAt) {
        sessionRef.current = { id: parsed.id, startedAt: parsed.startedAt, subjectId: parsed.subjectId };
        accumulatedMsRef.current = parsed.accumulatedMs ?? 0;
        setSession(sessionRef.current);
        setStatus("paused");
        setElapsedMs(accumulatedMsRef.current);
      }
    } catch {}
  }, [userId, storageKey]);

  // Keep interval in sync
  useEffect(() => {
    if (status === "running") {
      startTicking();
    } else {
      stopTicking();
    }
    return () => stopTicking();
  }, [status]);

  const start = async (subjectId: string | null) => {
    if (status !== "idle") return;
    const res = await apiRequest<{ session: StudyTimerSession }>("/api/study-sessions", {
      method: "POST",
      json: subjectId ? { subjectId } : {},
    });
    if (!res.ok) return;
    const next = res.data.session;
    accumulatedMsRef.current = 0;
    segmentStartRef.current = Date.now();
    setSession(next);
    setStatus("running");
    setElapsedMs(0);
    persist(0);
  };

  const pause = () => {
    if (status !== "running") return;
    const now = Date.now();
    accumulatedMsRef.current += now - (segmentStartRef.current ?? now);
    segmentStartRef.current = null;
    setStatus("paused");
    setElapsedMs(accumulatedMsRef.current);
    persist(accumulatedMsRef.current);
  };

  const resume = () => {
    if (status !== "paused" || !session) return;
    segmentStartRef.current = Date.now();
    setStatus("running");
  };

  const stop = async () => {
    if (!session) return;
    const activeMs = currentMs();
    const wallMs = Math.max(0, Date.now() - new Date(session.startedAt).getTime());
    const pausedMs = Math.max(0, Math.round(wallMs - activeMs));
    const res = await apiRequest("/api/study-sessions/" + session.id, {
      method: "PATCH",
      json: { pausedMs }
    });
    if (!res.ok) return;
    accumulatedMsRef.current = 0;
    segmentStartRef.current = null;
    setSession(null);
    setStatus("idle");
    setElapsedMs(0);
    clearPersisted();
    stopTicking();
  };

  return (
    <StudyTimerContext.Provider value={{ status, elapsedMs, session, start, pause, resume, stop, userId }}>
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const ctx = useContext(StudyTimerContext);
  if (!ctx) throw new Error("useStudyTimer must be used within StudyTimerProvider");
  return ctx;
}
