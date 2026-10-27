"use client";

import { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  X,
  History,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { apiRequest } from "@/app/lib/api-client";
import { Reveal } from "@/components/marketing/reveal";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  position: number;
  correctIndex?: number;
  explanation?: string | null;
};

type Attempt = {
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

type QuizDetail = {
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
  questions: Question[];
};

type AnswerState = Record<string, number | null>;

const bannerClasses =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300";

const secondaryButtonClasses =
  "inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

const primaryButtonClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60";

const optionButtonClasses = (
  isSelected: boolean,
  isCorrect: boolean,
  showResults: boolean,
) => {
  const base =
    "w-full rounded-xl border px-3.5 py-2.5 text-sm text-left transition disabled:cursor-not-allowed disabled:opacity-60";
  if (showResults && isCorrect) {
    return `${base} border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-300`;
  }
  if (showResults && isSelected && !isCorrect) {
    return `${base} border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/30 dark:bg-rose-900/20 dark:text-rose-300`;
  }
  if (isSelected) {
    return `${base} border-accent-400 bg-accent-50 text-accent-800 dark:border-accent-400 dark:bg-accent-500/10 dark:text-accent-300`;
  }
  return `${base} border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800`;
};

type ViewMode = "exam" | "results" | "history";

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: quizIdFromPath } = use(params);

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // View mode: exam (taking quiz), results (after submit), history (past attempts)
  const [viewMode, setViewMode] = useState<ViewMode>("exam");

  // Exam state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);

  // History state
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Deadline is server-authoritative - compute remaining time from it
  const deadline = attempt?.deadline ? new Date(attempt.deadline).getTime() : null;

  // Ref for handleSubmit to avoid circular dependency with useEffect
  const handleSubmitRef = useRef<() => Promise<void>>(async () => {});

  // Timer effect - calculates remaining time from server deadline
  useEffect(() => {
    if (!deadline || showResults) return;

    const updateTime = () => {
      const now = Date.now();
      const remaining = deadline - now;
      if (remaining <= 0) {
        setTimeRemaining(0);
        setTimerExpired(true);
      } else {
        setTimeRemaining(remaining);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline, showResults]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timerExpired && !showResults && attempt?.status === "in_progress") {
      handleSubmitRef.current?.();
    }
  }, [timerExpired, showResults, attempt?.status]);

  // Load quiz and attempt on mount
  const loadQuiz = useCallback(async () => {
    if (!quizIdFromPath) {
      setLoadError("Quiz ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      // Load quiz detail with questions (without correct answers for exam)
      const quizResult = await apiRequest<{ quiz: QuizDetail }>(
        `/api/quizzes/${quizIdFromPath}`,
        { notFoundMessage: "That quiz no longer exists." }
      );

      if (!quizResult.ok) {
        if (quizResult.failure.kind === "not-found" || quizResult.failure.kind === "forbidden") {
          setLoadError(quizResult.failure.message);
        } else if (quizResult.failure.kind === "unauthorized") {
          setLoadError("Your session has expired. Please sign in again.");
        } else {
          setLoadError(quizResult.failure.message);
        }
        setLoading(false);
        return;
      }

      const loadedQuiz = quizResult.data.quiz;
      if (!loadedQuiz || typeof loadedQuiz.id !== "string") {
        setLoadError("Unexpected response from the server.");
        setLoading(false);
        return;
      }

      setQuiz(loadedQuiz);

      // Start or resume attempt
      const attemptResult = await apiRequest<{ attempt: Attempt; questions: Question[] }>(
        `/api/quizzes/${quizIdFromPath}/attempts`,
        { method: "POST" }
      );

      if (!attemptResult.ok) {
        setLoadError(attemptResult.failure.message);
        setLoading(false);
        return;
      }

      const loadedAttempt = attemptResult.data.attempt;
      const loadedQuestions = attemptResult.data.questions;

      // Merge questions with correct answers from quiz detail for results view
      const questionsWithAnswers = loadedQuiz.questions.map((q) => {
        const examQuestion = loadedQuestions.find((eq) => eq.id === q.id);
        return {
          ...q,
          ...examQuestion,
        };
      });

      setQuiz((prev) =>
        prev ? { ...prev, questions: questionsWithAnswers } : prev
      );
      setAttempt(loadedAttempt);

      // Restore saved answers
      const savedAnswers: AnswerState = {};
      loadedAttempt.answers.forEach((a) => {
        savedAnswers[a.questionId] = a.selectedIndex;
      });
      setAnswers(savedAnswers);
    } catch (error) {
      console.error("Failed to load quiz:", error);
      setLoadError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [quizIdFromPath]);

  // Load attempts history
  const loadHistory = useCallback(async () => {
    if (!quizIdFromPath) return;

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const result = await apiRequest<{ attempts: Attempt[] }>(
        `/api/quizzes/${quizIdFromPath}/attempts`,
        { notFoundMessage: "Could not load attempts." }
      );

      if (!result.ok) {
        setHistoryError(result.failure.message);
        return;
      }

      setAttempts(result.data.attempts ?? []);
    } catch (error) {
      console.error("Failed to load attempts:", error);
      setHistoryError("Something went wrong");
    } finally {
      setHistoryLoading(false);
    }
  }, [quizIdFromPath]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  // Load history when switching to history tab
  useEffect(() => {
    if (viewMode === "history") {
      void loadHistory();
    }
  }, [viewMode, loadHistory]);

  // Save answer to server as user progresses
  const saveAnswer = useCallback(
    async (questionId: string, selectedIndex: number | null) => {
      if (!attempt || attempt.status !== "in_progress" || showResults) return;

      try {
        await apiRequest<{ ok: boolean }>(
          `/api/quizzes/${quizIdFromPath}/attempts/${attempt.id}`,
          {
            method: "PATCH",
            json: { answers: [{ questionId, selectedIndex }] },
          }
        );
      } catch (error) {
        console.error("Failed to save answer:", error);
      }
    },
    [attempt, quizIdFromPath, showResults]
  );

  const handleOptionSelect = (questionId: string, index: number) => {
    if (showResults || attempt?.status !== "in_progress") return;
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
    void saveAnswer(questionId, index);
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const nextQuestion = () => {
    if (!quiz) return;
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!attempt || attempt.status !== "in_progress" || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    // Prepare all answers for submission
    const allAnswers = quiz?.questions.map((q) => ({
      questionId: q.id,
      selectedIndex: answers[q.id] ?? null,
    })) ?? [];

    const result = await apiRequest<{ attempt: Attempt }>(
      `/api/quizzes/${quizIdFromPath}/attempts/${attempt.id}`,
      {
        method: "PATCH",
        json: { answers: allAnswers },
      }
    );

    setSubmitting(false);

    if (!result.ok) {
      if (result.failure.kind === "not-found" || result.failure.kind === "forbidden") {
        setSubmitError(result.failure.message);
      } else if (result.failure.message?.includes("expired") || result.failure.message?.includes("Time is up")) {
        setTimerExpired(true);
        setSubmitError("Time is up. Your attempt has been submitted automatically.");
        // Reload to get the final state
        void loadQuiz();
      } else {
        setSubmitError(result.failure.message);
      }
      return;
    }

    const submittedAttempt = result.data.attempt;
    setAttempt(submittedAttempt);
    setShowResults(true);
  }, [attempt, submitting, quiz, answers, quizIdFromPath, loadQuiz]);

  // Update ref after handleSubmit is defined
  useLayoutEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const currentQuestion = quiz?.questions[currentIndex];

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((v) => v !== null).length;
  }, [answers]);

  const renderLoading = () => (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );

  const renderEmpty = () => (
    <Reveal direction="scale">
      <EmptyState
        icon={AlertCircle}
        title={loadError ? "Couldn't load this quiz" : "Quiz not found"}
        description={
          loadError ??
          "That quiz doesn't exist or belongs to someone else. Head back to your quizzes."
        }
        cta={{
          label: "Back to quizzes",
          onClick: () => router.push("/dashboard/quizzes"),
        }}
      />
    </Reveal>
  );

  const renderExam = () => {
    if (!quiz || !attempt) return null;

    const isTimed = quiz.timeLimit && quiz.timeLimit > 0;
    const progress = quiz.questions.length > 0 ? ((currentIndex + 1) / quiz.questions.length) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Header with progress and timer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {quiz.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Question {currentIndex + 1} of {quiz.questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress bar */}
            <div className="hidden sm:flex items-center gap-3 w-64">
              <div className="flex-1 h-2 rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-accent-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-10 text-right">
                {Math.round(progress)}%
              </span>
            </div>
            {/* Timer */}
            {isTimed && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-semibold ${
                  timeRemaining !== null && timeRemaining < 60000
                    ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/30"
                    : "bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                }`}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{formatTime(timeRemaining ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Question navigation */}
        <div className="flex flex-wrap gap-1">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToQuestion(index)}
              disabled={showResults}
              aria-label={`Question ${index + 1}`}
              aria-current={index === currentIndex ? "true" : "false"}
              className={`w-8 h-8 rounded-xl text-xs font-medium transition ${
                showResults
                  ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  : index === currentIndex
                  ? "bg-accent-500 text-white shadow-sm shadow-accent-500/30"
                  : answers[quiz.questions[index].id] !== undefined
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Current question */}
        {currentQuestion ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
              {currentQuestion.prompt}
            </h3>
            <div className="grid gap-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleOptionSelect(currentQuestion.id, index)}
                  disabled={showResults || attempt.status !== "in_progress"}
                  className={optionButtonClasses(
                    answers[currentQuestion.id] === index,
                    showResults && currentQuestion.correctIndex === index,
                    showResults
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium ${
                        showResults && currentQuestion.correctIndex === index
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                          : showResults && answers[currentQuestion.id] === index && currentQuestion.correctIndex !== index
                          ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800/30 dark:bg-rose-900/20 dark:text-rose-300"
                          : answers[currentQuestion.id] === index
                          ? "border-accent-400 bg-accent-50 text-accent-700 dark:border-accent-400 dark:bg-accent-500/10 dark:text-accent-300"
                          : "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {showResults && currentQuestion.correctIndex === index ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : showResults && answers[currentQuestion.id] === index && currentQuestion.correctIndex !== index ? (
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <span>{option}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Explanation in results mode */}
            {showResults && currentQuestion.explanation && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Explanation:</strong> {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={prevQuestion}
                disabled={currentIndex === 0 || showResults || attempt.status !== "in_progress"}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Previous
              </button>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {answeredCount} of {quiz.questions.length} answered
              </div>
              <button
                type="button"
                onClick={nextQuestion}
                disabled={currentIndex === quiz.questions.length - 1 || showResults || attempt.status !== "in_progress"}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={AlertCircle}
            title="No questions found"
            description="This quiz has no questions yet."
          />
        )}

        {/* Submit section */}
        {attempt.status === "in_progress" && !showResults && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {submitError ? (
              <div role="alert" className={`mb-4 ${bannerClasses}`}>
                {submitError}
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">Ready to submit?</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  You&apos;ve answered {answeredCount} of {quiz?.questions.length ?? 0} questions.
                  {answeredCount < (quiz?.questions.length ?? 0) && " Unanswered questions will be marked incorrect."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={primaryButtonClasses}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting...
                  </>
                ) : (
                  "Submit quiz"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results view */}
        {showResults && attempt && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-center">
              <div className="text-4xl font-display font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                {attempt.score ?? 0}%
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                {attempt.correctCount} correct · {attempt.incorrectCount} incorrect · {attempt.unansweredCount} unanswered
              </div>
              <div className="flex items-center justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                <span>Started: {new Date(attempt.startedAt).toLocaleString()}</span>
                {attempt.submittedAt && (
                  <span>Submitted: {new Date(attempt.submittedAt).toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <Link
                href="/dashboard/quizzes"
                className={secondaryButtonClasses}
              >
                Back to quizzes
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    if (!quiz) return null;

    const hasInProgress = attempts.some((a) => a.status === "in_progress");

    return (
      <div className="space-y-6">
        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode("exam")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              viewMode === "exam"
                ? "border-accent-500 text-accent-600 dark:text-accent-400"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            Take Quiz
          </button>
          <button
            type="button"
            onClick={() => setViewMode("history")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              viewMode === "history"
                ? "border-accent-500 text-accent-600 dark:text-accent-400"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <History className="h-4 w-4 inline mr-1.5" aria-hidden="true" />
            Attempts
          </button>
        </div>

        {/* History content */}
        {historyLoading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        ) : historyError ? (
          <Reveal direction="scale">
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load attempts"
              description={historyError}
              cta={{
                label: "Try again",
                onClick: loadHistory,
              }}
            />
          </Reveal>
        ) : attempts.length === 0 ? (
          <Reveal direction="scale">
            <EmptyState
              icon={History}
              title="No attempts yet"
              description="Start your first attempt to see your results here."
              cta={{
                label: "Take quiz",
                onClick: () => setViewMode("exam"),
              }}
            />
          </Reveal>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <AttemptCard
                key={attempt.id}
                attempt={attempt}
                onResume={() => {
                  setAttempt(attempt);
                  setViewMode("exam");
                  // Restore answers
                  const savedAnswers: AnswerState = {};
                  attempt.answers.forEach((a) => {
                    savedAnswers[a.questionId] = a.selectedIndex;
                  });
                  setAnswers(savedAnswers);
                  setShowResults(false);
                  setCurrentIndex(0);
                }}
                onReview={() => {
                  setAttempt(attempt);
                  setViewMode("results");
                  setShowResults(true);
                  // Restore answers for review
                  const savedAnswers: AnswerState = {};
                  attempt.answers.forEach((a) => {
                    savedAnswers[a.questionId] = a.selectedIndex;
                  });
                  setAnswers(savedAnswers);
                }}
                inProgress={hasInProgress && attempt.status !== "in_progress"}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Attempt card component for history view
  const AttemptCard = ({
    attempt,
    onResume,
    onReview,
    inProgress,
  }: {
    attempt: Attempt;
    onResume: () => void;
    onReview: () => void;
    inProgress: boolean;
  }) => {
    const isInProgress = attempt.status === "in_progress";
    const isCompleted = attempt.status === "submitted";
    const isExpired = attempt.status === "expired";

    const statusColor = isInProgress
      ? "bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-500/10 dark:text-accent-300 dark:border-accent-800/30"
      : isCompleted
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30"
      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/30";

    const statusLabel = isInProgress ? "In progress" : isCompleted ? "Completed" : "Expired";

    const startedAt = new Date(attempt.startedAt);
    const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt) : null;
    const duration = submittedAt
      ? Math.round((submittedAt.getTime() - startedAt.getTime()) / 60000)
      : null;

    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
            >
              {statusLabel}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              Started {startedAt.toLocaleDateString()} at {startedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {submittedAt && (
                <>
                  · Submitted {submittedAt.toLocaleDateString()} at{" "}
                  {submittedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </>
              )}
              {duration !== null && <span> · {duration} min</span>}
            </div>
          </div>

          {isCompleted && (
            <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {attempt.correctCount} correct
              </span>
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {attempt.incorrectCount} incorrect
              </span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {attempt.unansweredCount} unanswered
              </span>
              <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" aria-hidden="true" />
              <span className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {attempt.score ?? 0}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isInProgress && (
              <button
                type="button"
                onClick={onResume}
                disabled={inProgress}
                className={primaryButtonClasses}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Resume
              </button>
            )}
            {isCompleted && (
              <button
                type="button"
                onClick={onReview}
                className={secondaryButtonClasses}
              >
                Review
              </button>
            )}
            {isExpired && (
              <button
                type="button"
                onClick={() => setViewMode("exam")}
                className={primaryButtonClasses}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render based on view mode
  const renderContent = () => {
    if (loading) return renderLoading();
    if (loadError) return renderEmpty();
    if (viewMode === "history") return renderHistory();
    if (viewMode === "results" && attempt && showResults) {
      // Results view
      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-center">
            <div className="text-4xl font-display font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {attempt.score ?? 0}%
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {attempt.correctCount} correct · {attempt.incorrectCount} incorrect · {attempt.unansweredCount} unanswered
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <span>Started: {new Date(attempt.startedAt).toLocaleString()}</span>
              {attempt.submittedAt && (
                <span>Submitted: {new Date(attempt.submittedAt).toLocaleString()}</span>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("exam")}
              className={secondaryButtonClasses}
            >
              Retry quiz
            </button>
            <button
              type="button"
              onClick={() => setViewMode("history")}
              className={secondaryButtonClasses}
            >
              View all attempts
            </button>
            <Link
              href="/dashboard/quizzes"
              className={secondaryButtonClasses}
            >
              Back to quizzes
            </Link>
          </div>
        </div>
      );
    }
    return renderExam();
  };

  const content = renderContent();

  return (
    <DashboardShell name="Student">
      {!quiz ? null : (
        <>
          <Reveal direction="up">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <Link
                  href="/dashboard/quizzes"
                  className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  ← Your quizzes
                </Link>
                <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                  {quiz.title}
                </h1>
              </div>
            </div>
          </Reveal>

          <Reveal direction="up" delay={0.08}>
            <div className="mt-8">{content}</div>
          </Reveal>
        </>
      )}
    </DashboardShell>
  );
}