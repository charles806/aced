"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Dialog } from "@/components/dashboard/dialog";
import { apiRequest } from "@/app/lib/api-client";
import { useFlashcards, type FlashcardDeck } from "@/components/dashboard/use-flashcards";
import { useNotes } from "@/components/dashboard/use-notes";
import { DeckCard } from "@/components/flashcards/deck-card";
import { Reveal } from "@/components/marketing/reveal";

const DECK_TITLE_MAX_LENGTH = 100;

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

const COUNT_OPTIONS = [6, 12, 24];

export default function FlashcardsPage() {
  const router = useRouter();
  const { state, reload, addDeck, setDecks } = useFlashcards();
  const { state: notesState } = useNotes();

  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const [createDifficulty, setCreateDifficulty] = useState("mixed");
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Generate dialog state
  const [genTitle, setGenTitle] = useState("");
  const [genDifficulty, setGenDifficulty] = useState("mixed");
  const [genCount, setGenCount] = useState(12);
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
    setDeckTitle("");
    setCreateDifficulty("mixed");
    setFormError(null);
    setGenTitle("");
    setGenDifficulty("mixed");
    setGenCount(12);
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

    const trimmed = deckTitle.trim();
    if (trimmed === "") {
      setFormError("Please enter a deck title.");
      return;
    }
    if (trimmed.length > DECK_TITLE_MAX_LENGTH) {
      setFormError(
        `Deck titles must be ${DECK_TITLE_MAX_LENGTH} characters or fewer.`,
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const result = await apiRequest<{ deck: FlashcardDeck }>(
      "/api/flashcards",
      {
        method: "POST",
        json: { title: trimmed, difficulty: createDifficulty },
      }
    );

    if (!result.ok) {
      setFormError(result.failure.message);
      setSubmitting(false);
      return;
    }

    const saved = result.data.deck;
    if (!saved || typeof saved.id !== "string") {
      closeDialog();
      void reload();
      setSubmitting(false);
      return;
    }

    addDeck(saved);
    setSubmitting(false);
    closeDialog();
  };

  const handleGenerateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!genNoteId) {
      setGenError("Please choose a note to generate flashcards from.");
      return;
    }

    setGenWorking(true);
    setGenError(null);

    const result = await apiRequest<{ deck: FlashcardDeck }>(
      "/api/flashcards/generate",
      {
        method: "POST",
        json: {
          noteId: genNoteId,
          title: genTitle.trim() || undefined,
          count: genCount,
          difficulty: genDifficulty,
        },
      }
    );

    setGenWorking(false);

    if (!result.ok) {
      setGenError(result.failure.message);
      return;
    }

    const saved = result.data.deck;
    if (!saved || typeof saved.id !== "string") {
      closeDialog();
      void reload();
      return;
    }

    addDeck(saved);
    closeDialog();
  };

  const handleConfirmDelete = async (deckId: string) => {
    setDeletingId(deckId);
    setSectionError(null);

    const result = await apiRequest<{ ok: boolean }>(
      `/api/flashcards/${deckId}`,
      { method: "DELETE" }
    );

    if (!result.ok) {
      if (result.failure.kind === "not-found") {
        // Already gone — treat as success.
        setDecks((previous) => previous.filter((d) => d.id !== deckId));
        setDeletingId(null);
        return;
      }
      setSectionError(result.failure.message);
      setDeletingId(null);
      return;
    }

    setDecks((previous) => previous.filter((d) => d.id !== deckId));
    setDeletingId(null);
  };

  const renderDeckList = () => {
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
            title="Couldn't load your decks"
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

    if (state.decks.length === 0) {
      return (
        <Reveal direction="scale">
          <EmptyState
            icon={FileText}
            title="No flashcard decks yet"
            description={
              "Create a deck manually or generate one from your notes. " +
              "Flashcards are an ACED Pro feature."
            }
            cta={{ label: "Create a deck", onClick: openCreate }}
          />
        </Reveal>
      );
    }

    return (
      <Reveal direction="up" delay={0.06}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onOpenStudy={() => router.push(`/dashboard/flashcards/${deck.id}`)}
              onDelete={() => handleConfirmDelete(deck.id)}
              deleting={deletingId === deck.id}
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
              Flashcards
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Study your notes one card at a time.
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
              New deck
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
        <div className="mt-8">{renderDeckList()}</div>
      </Reveal>

      {/* Create deck dialog */}
      <Dialog
        open={dialog?.kind === "create"}
        onClose={() => {
          if (!submitting) closeDialog();
        }}
        title="New deck"
        description="Give your deck a title. You can add cards one at a time."
      >
        <form onSubmit={handleCreateSubmit} noValidate>
          {formError ? (
            <div role="alert" className={`mb-4 ${bannerClasses}`}>
              {formError}
            </div>
          ) : null}

          <label htmlFor="deck-title" className={labelClasses}>
            Deck title
          </label>
          <input
            id="deck-title"
            type="text"
            maxLength={DECK_TITLE_MAX_LENGTH + 20}
            placeholder="e.g. Biology Chapter 3"
            value={deckTitle}
            onChange={(event) => setDeckTitle(event.target.value)}
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? "deck-title-error" : undefined}
            className={inputClasses}
          />

          <label className={`${labelClasses} mt-4`}>Difficulty</label>
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
              Create deck
            </button>
          </div>
        </form>
      </Dialog>

      {/* Generate deck dialog */}
      <Dialog
        open={dialog?.kind === "generate"}
        onClose={() => {
          if (!genWorking) closeDialog();
        }}
        title="Generate flashcards"
        description="Pick one of your notes and ACED will turn it into a deck of question-and-answer cards."
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
            Deck title (optional)
          </label>
          <input
            id="gen-title"
            type="text"
            maxLength={DECK_TITLE_MAX_LENGTH + 20}
            placeholder="Uses the note title if left blank"
            value={genTitle}
            onChange={(event) => setGenTitle(event.target.value)}
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
              <label className={labelClasses}>Number of cards</label>
              <div className="grid gap-1">
                {COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={genCount === count}
                    disabled={genWorking}
                    onClick={() => setGenCount(count)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                      genCount === count
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
              Generate deck
            </button>
          </div>
        </form>
      </Dialog>
    </DashboardShell>
  );
}
