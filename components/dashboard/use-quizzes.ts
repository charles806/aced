"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";

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

export function useQuizzes() {
  const [state, setState] = useState<QuizzesState>({ status: "loading" });

  const fetchQuizzes = useCallback(async (): Promise<ApiResult<QuizzesPayload>> => {
    return apiRequest<QuizzesPayload>("/api/quizzes", {
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

    void fetchQuizzes().then((result) => {
      if (!ignore) applyResult(result);
    });

    return () => {
      ignore = true;
    };
  }, [fetchQuizzes, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void fetchQuizzes().then(applyResult);
  }, [fetchQuizzes, applyResult]);

  const setQuizzes = useCallback(
    (update: (previous: Quiz[]) => Quiz[]) => {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", quizzes: update(current.quizzes) }
          : current
      );
    },
    []
  );

  const addQuiz = useCallback((quiz: Quiz) => {
    setState((current) =>
      current.status === "ready"
        ? { status: "ready", quizzes: [quiz, ...current.quizzes] }
        : current
    );
  }, []);

  const updateQuiz = useCallback((quiz: Quiz) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            quizzes: current.quizzes.map((item) =>
              item.id === quiz.id ? quiz : item
            ),
          }
        : current
    );
  }, []);

  const removeQuiz = useCallback((quizId: string) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            quizzes: current.quizzes.filter((item) => item.id !== quizId),
          }
        : current
    );
  }, []);

  return {
    state,
    reload,
    setQuizzes,
    addQuiz,
    updateQuiz,
    removeQuiz,
  };
}