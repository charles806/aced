"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Dialog } from "@/components/dashboard/dialog";
import { apiRequest } from "@/app/lib/api-client";
import { useQuizzes, type Quiz } from "@/components/dashboard/use-quizzes";
import { useNotes } from "@/components/dashboard/use-notes";
import { Reveal } from "@/components/marketing/reveal";

const QUIZ_TITLE_MAX_LENGTH = 100;

const inputClasses =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20";

const labelClasses =
  "mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200";

const bannerClasses =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300";

const secondaryButtonClasses =
  "inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

const primaryButtonClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60";

type ActiveDialog =
  | { kind: "create" }
  | { kind: "generate" }
  | null;

function difficultyOption(label: string, value: string) {
  return { label, value };
}

const DIFFICULTY_OPTIONS = [
  difficultyOption("Easy", "easy"),
  difficultyOption("Medium", "medium"),
  difficultyOption("Hard", "hard"),
  difficultyOption("Mixed", "mixed"),
];

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];

const TIME_LIMIT_OPTIONS = [
  { label: "No time limit", value: null },
  { label: "10 minutes", value: 10 },
  { label: "20 minutes", value: 20 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "60 minutes", value: 60 },
];

export default function QuizzesPage() {
  const router = useRouter();
  const { state, reload, addQuiz, setQuizzes } = useQuizzes();
  const { state: notesState } = useNotes();

  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [createDifficulty, setCreateDifficulty] = useState("mixed");
  const [createQuestionCount, setCreateQuestionCount] = useState(10);
  const [createTimeLimit, setCreateTimeLimit] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Generate dialog state
  const [genTitle, setGenTitle] = useState("");
  const [genDifficulty, setGenDifficulty] = useState("mixed");
  const [genQuestionCount, setGenQuestionCount] = useState(10);
  const [genTimeLimit, setGenTimeLimit] = useState<number | null>(null);
  const [genNoteId, setGenNoteId] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genWorking, setGenWorking] = useState(false);

  useEffect(() => {
    if (notesState.status === "error" && notesState.unauthorized) {
      // Session expired — handled by the shell; surface once here too.
    }
  }, [notesState]);

  const closeDialog = () => {
    setDialog(null);
    setQuizTitle("");
    setCreateDifficulty("mixed");
    setCreateQuestionCount(10);
    setCreateTimeLimit(null);
    setFormError(null);
    setGenTitle("");
    setGenDifficulty("mixed");
    setGenQuestionCount(10);
    setGenTimeLimit(null);
    setGenNoteId(null);
    setGenError(null);
    setGenWorking(false);
  };

  const openCreate = () => {
    setSectionError(null);
    setFormError(null);
    setDialog({ kind: "create" });
  };

  const openGenerate = () => {
    setSectionError(null);
    setGenError(null);
    setDialog({ kind: "generate" });
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = quizTitle.trim();
    if (trimmed === "") {
      setFormError("Please enter a quiz title.");
      return;
    }
    if (trimmed.length > QUIZ_TITLE_MAX_LENGTH) {
      setFormError(`Quiz titles must be ${QUIZ_TITLE_MAX_LENGTH} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const result = await apiRequest<{ quiz: Quiz }>(
      "/api/quizzes",
      {
        method: "POST",
        json: {
          title: trimmed,
          difficulty: createDifficulty,
          questionCount: createQuestionCount,
          timeLimit: createTimeLimit,
        },
      }
    );

    if (!result.ok) {
      setFormError(result.failure.message);
      setSubmitting(false);
      return;
    }

    const saved = result.data.quiz;
    if (!saved || typeof saved.id !== "string") {
      closeDialog();
      void reload();
      setSubmitting(false);
      return;
    }

    addQuiz(saved);
    setSubmitting(false);
    closeDialog();
  };

  const handleGenerateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!genNoteId) {
      setGenError("Please choose a note to generate a quiz from.");
      return;
    }

    setGenWorking(true);
    setGenError(null);

    const result = await apiRequest<{ quiz: Quiz }>(
      "/api/quizzes/generate",
      {
        method: "POST",
        json: {
          noteId: genNoteId,
          title: genTitle.trim() || undefined,
          questionCount: genQuestionCount,
          difficulty: genDifficulty,
          timeLimit: genTimeLimit,
        },
      }
    );

    setGenWorking(false);

    if (!result.ok) {
      setGenError(result.failure.message);
      return;
    }

    const saved = result.data.quiz;
    if (!saved || typeof saved.id !== "string") {
      closeDialog();
      void reload();
      return;
    }

    addQuiz(saved);
    closeDialog();
  };

  const handleConfirmDelete = async (quizId: string) => {
    setDeletingId(quizId);
    setSectionError(null);

    const result = await apiRequest<{ ok: boolean }>(
      `/api/quizzes/${quizId}`,
      { method: "DELETE" }
    );

    if (!result.ok) {
      if (result.failure.kind === "not-found") {
        // Already gone — treat as success.
        setQuizzes((previous) => previous.filter((q) => q.id !== quizId));
        setDeletingId(null);
        return;
      }
      setSectionError(result.failure.message);
      setDeletingId(null);
      return;
    }

    setQuizzes((previous) => previous.filter((q) => q.id !== quizId));
    setDeletingId(null);
  };

  const renderQuizList = () => {
    if (state.status === "loading") {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 animate-pulse dark:border-zinc-800 dark:bg-zinc-900" />
          ))}
        </div>
      );
    }

    if (state.status === "error") {
      return (
        <Reveal direction="scale">
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load your quizzes"
            description={state.message}
            cta={{
              label: state.unauthorized ? "Sign in again" : "Try again",
              onClick: () => {
                if (state.unauthorized) router.push("/signin");
                else void reload();
              },
            }}
          />
        </Reveal>
      );
    }

    if (state.quizzes.length === 0) {
      return (
        <Reveal direction="scale">
          <EmptyState
            icon={FileText}
            title="No quizzes yet"
            description={
              "Create a quiz manually or generate one from your notes. " +
              "Quizzes are an ACED Pro feature."
            }
            cta={{ label: "Create a quiz", onClick: openCreate }}
          />
        </Reveal>
      );
    }

    return (
      <Reveal direction="up" delay={0.06}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onOpenTake={() => router.push(`/dashboard/quizzes/${quiz.id}`)}
              onDelete={() => handleConfirmDelete(quiz.id)}
              deleting={deletingId === quiz.id}
            />
          ))}
        </div>
      </Reveal>
    );
  };

  return (
    <DashboardShell name="Student">
      <Reveal direction="up">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Quizzes
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Test your knowledge with timed exams.
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openCreate}
              disabled={state.status === "loading"}
              className={primaryButtonClasses}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New quiz
            </button>
            <button
              type="button"
              onClick={openGenerate}
              disabled={state.status === "loading"}
              className={primaryButtonClasses}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate from note
            </button>
          </div>
        </div>
      </Reveal>

      {sectionError ? (
        <div role="alert" className={`mt-6 ${bannerClasses}`}>
          {sectionError}
        </div>
      ) : null}

      <Reveal direction="up" delay={0.08}>
        <div className="mt-8">{renderQuizList()}</div>
      </Reveal>

      {/* Create quiz dialog */}
      <Dialog
        open={dialog?.kind === "create"}
        onClose={() => {
          if (!submitting) closeDialog();
        }}
        title="New quiz"
        description="Give your quiz a title and configure the settings. You'll add questions after creation."
      >
        <form onSubmit={handleCreateSubmit} noValidate>
          {formError ? (
            <div role="alert" className={`mb-4 ${bannerClasses}`}>
              {formError}
            </div>
          ) : null}

          <label htmlFor="quiz-title" className={labelClasses}>
            Quiz title
          </label>
          <input
            id="quiz-title"
            type="text"
            maxLength={QUIZ_TITLE_MAX_LENGTH + 20}
            placeholder="e.g. Biology Chapter 3 — Midterm Prep"
            value={quizTitle}
            onChange={(event) => setQuizTitle(event.target.value)}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? "quiz-title-error" : undefined}
            className={inputClasses}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClasses}>Difficulty</label>
              <div className="grid gap-1">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={createDifficulty === option.value}
                    disabled={submitting}
                    onClick={() => setCreateDifficulty(option.value)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      createDifficulty === option.value
                        ? "border-accent-500 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClasses}>Number of questions</label>
              <div className="grid gap-1">
                {QUESTION_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={createQuestionCount === count}
                    disabled={submitting}
                    onClick={() => setCreateQuestionCount(count)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      createQuestionCount === count
                        ? "border-accent-500 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClasses}>Time limit</label>
            <div className="grid gap-1">
              {TIME_LIMIT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={createTimeLimit === option.value}
                  disabled={submitting}
                  onClick={() => setCreateTimeLimit(option.value)}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                    createTimeLimit === option.value
                      ? "border-accent-500 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-300"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={submitting}
              className={secondaryButtonClasses}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={primaryButtonClasses}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Create quiz
            </button>
          </div>
        </form>
      </Dialog>

      {/* Generate quiz dialog */}
      <Dialog
        open={dialog?.kind === "generate"}
        onClose={() => {
          if (!genWorking) closeDialog();
        }}
        title="Generate quiz"
        description="Pick one of your notes and ACED will turn it into a timed multiple-choice exam."
      >
        <form onSubmit={handleGenerateSubmit} noValidate>
          {genError ? (
            <div role="alert" className={`mb-4 ${bannerClasses}`}>
              {genError}
            </div>
          ) : null}

          <label htmlFor="gen-note" className={labelClasses}>
            Source note
          </label>
          <select
            id="gen-note"
            value={genNoteId ?? ""}
            onChange={(event) =>
              setGenNoteId(event.target.value || null)
            }
            disabled={notesState.status !== "ready" || genWorking}
            className={inputClasses}
          >
            <option value="">Choose a note…</option>
            {notesState.status === "ready" &&
              notesState.notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
          </select>
          {notesState.status === "error" && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Could not load notes &mdash; try again.
            </p>
          )}

          <label htmlFor="gen-title" className={`${labelClasses} mt-4`}>
            Quiz title (optional)
          </label>
          <input
            id="gen-title"
            type="text"
            maxLength={QUIZ_TITLE_MAX_LENGTH + 20}
            placeholder="Uses the note title if left blank"
            value={genTitle}
            onChange={(event) => setGenTitle(event.target.value)}
            className={inputClasses}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClasses}>Difficulty</label>
              <div className="grid gap-1">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={genDifficulty === option.value}
                    disabled={genWorking}
                    onClick={() => setGenDifficulty(option.value)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      genDifficulty === option.value
                        ? "border-accent-500 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClasses}>Number of questions</label>
              <div className="grid gap-1">
                {QUESTION_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={genQuestionCount === count}
                    disabled={genWorking}
                    onClick={() => setGenQuestionCount(count)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      genQuestionCount === count
                        ? "border-accent-500 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClasses}>Time limit</label>
              <div className="grid gap-1">
                {TIME_LIMIT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={genTimeLimit === option.value}
                    disabled={genWorking}
                    onClick={() => setGenTimeLimit(option.value)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      genTimeLimit === option.value
                        ? "border-accent-500 bg-accent-50 text-accent-700 dark:border-accent-500 dark:bg-accent-500/10 dark:text-accent-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={genWorking}
              className={secondaryButtonClasses}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={genWorking || notesState.status !== "ready"}
              className={primaryButtonClasses}
            >
              {genWorking ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Generate quiz
            </button>
          </div>
        </form>
      </Dialog>
    </DashboardShell>
  );
}

function QuizCard({
  quiz,
  onOpenTake,
  onDelete,
  deleting,
}: {
  quiz: Quiz;
  onOpenTake: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            {quiz.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 font-medium">
              {quiz._count.questions} question{quiz._count.questions !== 1 ? "s" : ""}
            </span>
            {quiz.timeLimit ? (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 font-medium">
                {quiz.timeLimit} min
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 font-medium">
                Untimed
              </span>
            )}
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 font-medium capitalize">
              {quiz.difficulty ?? "mixed"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenTake}
            disabled={deleting}
            className="rounded-xl bg-accent-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Take quiz
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 disabled:opacity-60"
            aria-label={`Delete ${quiz.title}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v10m-5-10h14m-5-5v5m-5-5v5" />
            </svg>
          </button>
        </div>
      </div>
      {deleting && (
        <div className="mt-3 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}