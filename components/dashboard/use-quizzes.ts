"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";
import { useDataCache, buildCacheKey } from "@/app/lib/data-cache";

export type Quiz = {
  id: string;
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  timeLimit: number | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    questions: number;
    attempts: number;
  };
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  position: number;
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  deadline: string;
  score: number | null;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  answers: { questionId: string; selectedIndex: number | null }[];
};

export type QuizzesState =
  | { status: "loading" }
  | { status: "error"; message: string; unauthorized: boolean }
  | { status: "ready"; quizzes: Quiz[] };

type QuizzesPayload = { quizzes: Quiz[] };

const LOAD_NOT_FOUND_FALLBACK = "Your quizzes could not be found.";
const QUIZZES_TTL_MS = 60_000; // 60 seconds

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

export function useQuizzes() {
  const { get, invalidate, getEntry } = useDataCache();
  const [state, setState] = useState<QuizzesState>({ status: "loading" });

  const cacheKey = "/api/quizzes";

  const fetchQuizzes = useCallback(async (): Promise<ApiResult<QuizzesPayload>> => {
    return apiRequest<QuizzesPayload>(cacheKey, {
      notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
    });
  }, []);

  const applyResult = useCallback(
    (result: ApiResult<QuizzesPayload>) => {
      if (!result.ok) {
        setState({
          status: "error",
          message: result.failure.message,
          unauthorized: result.failure.kind === "unauthorized",
        });
        return;
      }

      const quizzes = Array.isArray(result.data?.quizzes) ? result.data.quizzes : [];

      setState({ status: "ready", quizzes });
    },
    []
  );

  useEffect(() => {
    let ignore = false;

    const cached = getEntry<QuizzesPayload>(cacheKey);
    if (cached && cached.status === "ready") {
      const isStale = Date.now() - cached.lastFetched > QUIZZES_TTL_MS;
      if (!isStale) {
        applyResult({ ok: true, data: cached.data });
        // Revalidate in background
        void get(cacheKey, fetchQuizzes, { ttlMs: QUIZZES_TTL_MS, dedupe: true }).then((res) => {
          if (!ignore && res.status === "ready" && res.data) {
            applyResult({ ok: true, data: res.data });
          }
        });
        return;
      }
    }

    void get(cacheKey, fetchQuizzes, { ttlMs: QUIZZES_TTL_MS, dedupe: true }).then((res) => {
      if (!ignore) {
        applyResult(toApiResult(res));
      }
    });

    return () => {
      ignore = true;
    };
  }, [get, getEntry, cacheKey, fetchQuizzes, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void get(cacheKey, fetchQuizzes, { ttlMs: 0, dedupe: false }).then((res) => applyResult(toApiResult(res)));
  }, [get, cacheKey, fetchQuizzes, applyResult]);

  const setQuizzes = useCallback(
    (update: (previous: Quiz[]) => Quiz[]) => {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", quizzes: update(current.quizzes) }
          : current
      );
      invalidate(cacheKey);
    },
    [invalidate, cacheKey]
  );

  const addQuiz = useCallback((quiz: Quiz) => {
    setState((current) =>
      current.status === "ready"
        ? { status: "ready", quizzes: [quiz, ...current.quizzes] }
        : current
    );
    invalidate(cacheKey);
  }, [invalidate, cacheKey]);

  const updateQuiz = useCallback((quiz: Quiz) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            quizzes: current.quizzes.map((item) => (item.id === quiz.id ? quiz : item)),
          }
        : current
    );
    invalidate(cacheKey);
  }, [invalidate, cacheKey]);

  const removeQuiz = useCallback((quizId: string) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            quizzes: current.quizzes.filter((item) => item.id !== quizId),
          }
        : current
    );
    invalidate(cacheKey);
  }, [invalidate, cacheKey]);

  return {
    state,
    reload,
    setQuizzes,
    addQuiz,
    updateQuiz,
    removeQuiz,
  };
}