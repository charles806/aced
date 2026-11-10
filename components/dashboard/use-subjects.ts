"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";
import { useDataCache, buildCacheKey } from "@/app/lib/data-cache";

export type Subject = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type SubjectsState =
  | { status: "loading" }
  | { status: "error"; message: string; unauthorized: boolean }
  | { status: "ready"; subjects: Subject[] };

const LOAD_NOT_FOUND_FALLBACK = "Your subjects could not be found.";

type SubjectsPayload = { subjects: Subject[] };

const SUBJECTS_CACHE_KEY = "/api/subject";
const SUBJECTS_TTL_MS = 60_000; // 60 seconds - subjects don't change often

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

export function useSubjects() {
  const { get, invalidate, getEntry } = useDataCache();
  const [state, setState] = useState<SubjectsState>({ status: "loading" });

  const fetchSubjects = useCallback(async (): Promise<ApiResult<SubjectsPayload>> => {
    return apiRequest<SubjectsPayload>(SUBJECTS_CACHE_KEY, {
      notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
    });
  }, []);

  const applyResult = useCallback(
    (result: ApiResult<SubjectsPayload>) => {
      if (!result.ok) {
        setState({
          status: "error",
          message: result.failure.message,
          unauthorized: result.failure.kind === "unauthorized",
        });
        return;
      }

      const subjects = Array.isArray(result.data?.subjects) ? result.data.subjects : [];
      setState({ status: "ready", subjects });
    },
    []
  );

  // Fetch with cache
  useEffect(() => {
    let ignore = false;

    const cached = getEntry<SubjectsPayload>(SUBJECTS_CACHE_KEY);
    if (cached && cached.status === "ready") {
      // Return cached data immediately if fresh
      const isStale = Date.now() - cached.lastFetched > SUBJECTS_TTL_MS;
      if (!isStale) {
        applyResult({ ok: true, data: cached.data });
        // Still revalidate in background
        void get(SUBJECTS_CACHE_KEY, fetchSubjects, { ttlMs: SUBJECTS_TTL_MS, dedupe: true }).then((res) => {
          if (!ignore && res.status === "ready" && res.data) {
            applyResult({ ok: true, data: res.data });
          }
        });
        return;
      }
    }

    // No fresh cache - fetch
    void get(SUBJECTS_CACHE_KEY, fetchSubjects, { ttlMs: SUBJECTS_TTL_MS, dedupe: true }).then((res) => {
      if (!ignore) {
        applyResult(toApiResult(res));
      }
    });

    return () => {
      ignore = true;
    };
  }, [get, getEntry, fetchSubjects, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void get(SUBJECTS_CACHE_KEY, fetchSubjects, { ttlMs: 0, dedupe: false }).then((res) => applyResult(toApiResult(res)));
  }, [get, fetchSubjects, applyResult]);

  const setSubjects = useCallback(
    (update: (previous: Subject[]) => Subject[]) => {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", subjects: update(current.subjects) }
          : current
      );
      // Invalidate cache so next fetch gets fresh data
      invalidate(SUBJECTS_CACHE_KEY);
    },
    [invalidate]
  );

  return { state, reload, setSubjects };
}