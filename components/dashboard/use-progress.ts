"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";

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

export function useProgress() {
  const [state, setState] = useState<ProgressState>({ status: "loading" });

  const fetchProgress = useCallback(async (): Promise<
    [ApiResult<StatsPayload>, ApiResult<ActivityPayload>]
  > => {
    return Promise.all([
      apiRequest<StatsPayload>("/api/study/stats", {
        notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
      }),
      apiRequest<ActivityPayload>("/api/activity", {
        notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
      }),
    ]);
  }, []);

  const applyResult = useCallback(
    (
      statsResult: ApiResult<StatsPayload>,
      activityResult: ApiResult<ActivityPayload>
    ) => {
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

    void fetchProgress().then(([statsResult, activityResult]) => {
      if (!ignore) applyResult(statsResult, activityResult);
    });

    return () => {
      ignore = true;
    };
  }, [fetchProgress, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void fetchProgress().then(([statsResult, activityResult]) =>
      applyResult(statsResult, activityResult)
    );
  }, [fetchProgress, applyResult]);

  return { state, reload };
}