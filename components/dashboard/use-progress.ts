"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";
import { useDataCache, buildCacheKey } from "@/app/lib/data-cache";

export type WeekDay = { day: string; date: string; ms: number };

export type SubjectBreakdown = {
  subjectId: string | null;
  subjectName: string;
  ms: number;
  sessionCount: number;
};

export type StudyStats = {
  todayMs: number;
  weekMs: number;
  totalMs: number;
  sessionCount: number;
  streakDays: number;
  notesCount: number;
  notesOpenedCount: number;
  notesCreatedCount: number;
  subjectsCount: number;
  weekByDay: WeekDay[];
  bySubject: SubjectBreakdown[];
};

export type ActivityItem = {
  id: string;
  type: string;
  noteId: string | null;
  subjectId: string | null;
  label: string;
  createdAt: string;
};

export type ProgressState =
  | { status: "loading" }
  | { status: "error"; message: string; unauthorized: boolean }
  | { status: "ready"; stats: StudyStats; activity: ActivityItem[] };

const LOAD_NOT_FOUND_FALLBACK = "Your progress could not be found.";

type StatsPayload = { stats: StudyStats };
type ActivityPayload = { items: ActivityItem[] };

const STATS_CACHE_KEY = "/api/study/stats";
const ACTIVITY_CACHE_KEY = "/api/activity";
const PROGRESS_TTL_MS = 60_000; // 60 seconds

type CacheResult<T> = { data: T | undefined; status: "loading" | "ready" | "error"; error?: string; unauthorized?: boolean };

function toApiResult<T>(res: CacheResult<T>): ApiResult<T> {
  if (res.status === "ready" && res.data) {
    return { ok: true, data: res.data };
  }
  if (res.status === "error") {
    return { ok: false, failure: { kind: res.unauthorized ? "unauthorized" : "server", message: res.error ?? "Failed to load" } };
  }
  return { ok: false, failure: { kind: "server", message: "Loading" } };
}

export function useProgress() {
  const { get, getEntry } = useDataCache();
  const [state, setState] = useState<ProgressState>({ status: "loading" });

  const fetchProgress = useCallback(async (): Promise<
    [ApiResult<StatsPayload>, ApiResult<ActivityPayload>]
  > => {
    return Promise.all([
      apiRequest<StatsPayload>(STATS_CACHE_KEY, {
        notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
      }),
      apiRequest<ActivityPayload>(ACTIVITY_CACHE_KEY, {
        notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
      }),
    ]);
  }, []);

  const applyResult = useCallback(
    (statsResult: ApiResult<StatsPayload>, activityResult: ApiResult<ActivityPayload>) => {
      if (!statsResult.ok) {
        setState({
          status: "error",
          message: statsResult.failure.message,
          unauthorized: statsResult.failure.kind === "unauthorized",
        });
        return;
      }

      const stats = statsResult.data.stats;

      const activity = activityResult.ok
        ? Array.isArray(activityResult.data?.items)
          ? activityResult.data.items
          : []
        : [];

      setState({ status: "ready", stats, activity });
    },
    []
  );

  useEffect(() => {
    let ignore = false;

    // Check both caches
    const statsCached = getEntry<StatsPayload>(STATS_CACHE_KEY);
    const activityCached = getEntry<ActivityPayload>(ACTIVITY_CACHE_KEY);
    const now = Date.now();

    const statsFresh = statsCached && statsCached.status === "ready" && now - statsCached.lastFetched <= PROGRESS_TTL_MS;
    const activityFresh = activityCached && activityCached.status === "ready" && now - activityCached.lastFetched <= PROGRESS_TTL_MS;

    if (statsFresh && activityFresh) {
      // Both fresh - use cached data
      applyResult({ ok: true, data: statsCached.data }, { ok: true, data: activityCached.data });
      // Revalidate in background
      void fetchProgress().then(([statsResult, activityResult]) => {
        if (!ignore) applyResult(statsResult, activityResult);
      });
      return;
    }

    // Fetch fresh data
    void fetchProgress().then(([statsResult, activityResult]) => {
      if (!ignore) applyResult(statsResult, activityResult);
    });

    return () => {
      ignore = true;
    };
  }, [getEntry, fetchProgress, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void fetchProgress().then(([statsResult, activityResult]) => applyResult(statsResult, activityResult));
  }, [fetchProgress, applyResult]);

  return { state, reload };
}