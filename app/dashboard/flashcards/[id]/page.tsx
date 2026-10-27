"use client";

import { use, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Edit2,
  Loader2,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { Dialog } from "@/components/dashboard/dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { apiRequest } from "@/app/lib/api-client";
import { Reveal } from "@/components/marketing/reveal";

type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  position: number;
};

type DeckDetail = {
  id: string;
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  cardCount: number;
  cards: Card[];
  progress: { cardId: string; status: string }[];
  createdAt: string;
  updatedAt: string;
};

type Mode = "study" | "edit";

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

const DANGER_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-600/30 transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60";

export default function FlashcardDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: deckIdFromPath } = use(params);

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Study state
  const [mode, setMode] = useState<Mode>("study");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [studyError, setStudyError] = useState<string | null>(null);
  const [workingCard, setWorkingCard] = useState<string | null>(null);

  // Edit state
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<{ id: string; front: string; back: string } | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Order is the sequence of indices currently being studied (shuffled or not).
  // Computed in an effect so Math.random is never called during render.
  const [studyOrder, setStudyOrder] = useState<number[]>([]);

  const recomputeOrder = useCallback(() => {
    if (!deck) {
      setStudyOrder([]);
      return;
    }
    const eligible = deck.cards
      .map((_, index) => index)
      .filter((index) => {
        if (!reviewOnly) return true;
        return progress[deck.cards[index].id] === "review";
      });
    if (shuffle) {
      setStudyOrder([...eligible].sort(() => 0.5 - Math.random()));
    } else {
      setStudyOrder(eligible);
    }
  }, [deck, shuffle, reviewOnly, progress]);

  useEffect(() => {
    recomputeOrder();
  }, [recomputeOrder]);

  const order = studyOrder;

  const currentCard = useMemo(() => {
    if (!deck || order.length === 0) return null;
    const index = order[currentIndex];
    return index !== undefined ? deck.cards[index] : null;
  }, [deck, order, currentIndex]);

  const studiedCount = useMemo(() => {
    if (!deck) return 0;
    return deck.cards.filter((c) => progress[c.id] !== undefined).length;
  }, [deck, progress]);

  const knowCount = useMemo(() => {
    if (!deck) return 0;
    return deck.cards.filter((c) => progress[c.id] === "know").length;
  }, [deck, progress]);

  const reviewCount = useMemo(() => {
    if (!deck) return 0;
    return deck.cards.filter((c) => progress[c.id] === "review").length;
  }, [deck, progress]);

  const loadDeck = useCallback(async () => {
    if (!deckIdFromPath) {
      setLoadError("Deck ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const result = await apiRequest<{ deck: DeckDetail }>(
      `/api/flashcards/${deckIdFromPath}`,
      { notFoundMessage: "That deck no longer exists." }
    );

    if (!result.ok) {
      if (result.failure.kind === "not-found" || result.failure.kind === "forbidden") {
        setLoadError(result.failure.message);
      } else if (result.failure.kind === "unauthorized") {
        setLoadError("Your session has expired. Please sign in again.");
      } else {
        setLoadError(result.failure.message);
      }
      setLoading(false);
      return;
    }

    const loaded = result.data.deck;
    if (!loaded || typeof loaded.id !== "string") {
      setLoadError("Unexpected response from the server.");
      setLoading(false);
      return;
    }

    setDeck(loaded);
    setLoading(false);
  }, [deckIdFromPath]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  // When the deck changes (e.g. cards edited), reset study position.
  useEffect(() => {
    if (deck) {
      setCurrentIndex(0);
      setShowingAnswer(false);
    }
  }, [deck]);

  const markCard = async (card: Card, status: "know" | "review") => {
    setStudyError(null);
    setWorkingCard(card.id);

    const next = { ...progress, [card.id]: status };
    setProgress(next);

    const result = await apiRequest<{ progress: { cardId: string; status: string } }>(
      `/api/flashcards/cards/${card.id}/progress`,
      { method: "POST", json: { status } }
    );

    setWorkingCard(null);

    if (!result.ok) {
      setStudyError(result.failure.message || "Couldn't save your progress.");
      // Revert optimistically.
      const reverted = { ...progress };
      delete reverted[card.id];
      setProgress(reverted);
      return;
    }

    setStudyError(null);
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setShowingAnswer(false);
    setStudyError(null);
  };

  const nextCard = () => {
    if (order.length === 0) return;
    goTo((currentIndex + 1) % order.length);
  };

  const prevCard = () => {
    if (order.length === 0) return;
    goTo((currentIndex - 1 + order.length) % order.length);
  };

  const toggleShuffle = () => {
    setShuffle((prev) => {
      const next = !prev;
      setCurrentIndex(0);
      setShowingAnswer(false);
      return next;
    });
  };

  const toggleReviewOnly = () => {
    setReviewOnly((prev) => {
      const next = !prev;
      setCurrentIndex(0);
      setShowingAnswer(false);
      return next;
    });
  };

  // -------- Card CRUD --------

  const addCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deck) return;
    const front = newFront.trim();
    const back = newBack.trim();
    if (!front || !back) {
      setEditError("Question and answer are both required.");
      return;
    }

    setEditError(null);

    const result = await apiRequest<{ card: Card }>(
      `/api/flashcards/${deck.id}/cards`,
      { method: "POST", json: { front, back } }
    );

    if (!result.ok) {
      setEditError(result.failure.message);
      return;
    }

    const saved = result.data.card;
    setDeck((previous) =>
      previous
        ? { ...previous, cards: [...previous.cards, saved] }
        : previous
    );
    setNewFront("");
    setNewBack("");
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCard || !deck) return;
    const front = editFront.trim();
    const back = editBack.trim();
    if (!front || !back) {
      setEditError("Question and answer are both required.");
      return;
    }

    setEditError(null);

    const result = await apiRequest<{ card: Card }>(
      `/api/flashcards/${deck.id}/cards/${editingCard.id}`,
      { method: "PATCH", json: { front, back } }
    );

    if (!result.ok) {
      setEditError(result.failure.message);
      return;
    }

    const saved = result.data.card;
    setDeck((previous) =>
      previous
        ? {
            ...previous,
            cards: previous.cards.map((c) => (c.id === saved.id ? saved : c)),
          }
        : previous
    );
    setEditingCard(null);
    setEditFront("");
    setEditBack("");
  };

  const deleteCard = async (card: Card) => {
    if (!deck) return;
    if (!window.confirm(`Delete this card from “${deck.title}"?`)) return;

    const result = await apiRequest<{ ok: boolean }>(
      `/api/flashcards/${deck.id}/cards/${card.id}`,
      { method: "DELETE" }
    );

    if (!result.ok) {
      setEditError(result.failure.message);
      return;
    }

    setDeck((previous) =>
      previous
        ? {
            ...previous,
            cards: previous.cards.filter((c) => c.id !== card.id),
            progress: previous.progress.filter((p) => p.cardId !== card.id),
          }
        : previous
    );
    setProgress((previous) => {
      const next = { ...previous };
      delete next[card.id];
      return next;
    });
  };

  // -------- Deck rename / delete --------

  const openRename = () => {
    setDeckTitle(deck?.title ?? "");
    setRenameError(null);
  };

  const saveRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deck) return;
    const title = deckTitle.trim();
    if (!title) {
      setRenameError("Deck title is required.");
      return;
    }

    setRenaming(true);
    setRenameError(null);

    const result = await apiRequest<{ deck: DeckDetail }>(
      `/api/flashcards/${deck.id}`,
      { method: "PATCH", json: { title } }
    );

    setRenaming(false);

    if (!result.ok) {
      setRenameError(result.failure.message);
      return;
    }

    setDeck(result.data.deck ?? null);
  };

  const confirmDeleteDeck = async () => {
    if (!deck) return;
    setDeletingDeck(true);
    setDeleteError(null);

    const result = await apiRequest<{ ok: boolean }>(
      `/api/flashcards/${deck.id}`,
      { method: "DELETE" }
    );

    setDeletingDeck(false);

    if (!result.ok) {
      setDeleteError(result.failure.message);
      return;
    }

    router.push("/dashboard/flashcards");
  };

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
        title={loadError ? "Couldn't load this deck" : "Deck not found"}
        description={
          loadError ??
          "That deck doesn't exist or belongs to someone else. Head back to your decks."
        }
        cta={{
          label: "Back to decks",
          onClick: () => router.push("/dashboard/flashcards"),
        }}
      />
    </Reveal>
  );

  // -------- Study view --------

  const renderStudy = () => {
    if (!deck) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {deck.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {deck.cards.length} card{deck.cards.length !== 1 ? "s" : ""}
              {deck.sourceNoteId ? " · From a saved note" : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleReviewOnly}
              aria-pressed={reviewOnly}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                reviewOnly
                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/30"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              Review only ({reviewCount})
            </button>
            <button
              type="button"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                shuffle
                  ? "bg-accent-50 text-accent-700 border border-accent-200 dark:bg-accent-900/20 dark:text-accent-300 dark:border-accent-800/30"
                  : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <Shuffle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {shuffle ? "Stop shuffle" : "Shuffle"}
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Edit cards
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Progress
            </span>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {studiedCount} of {deck.cards.length}
            </span>
          </div>
          <div className="h-2 w-full rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-accent-500 transition-all duration-300"
              style={{
                width:
                  deck.cards.length === 0
                    ? 0
                    : (studiedCount / deck.cards.length) * 100,
              }}
            />
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className={`font-medium ${knowCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>
              <Check className="h-3 w-3 mr-1" aria-hidden="true" />
              Know: {knowCount}
            </span>
            <span className={`font-medium ${reviewCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}>
              <X className="h-3 w-3 mr-1" aria-hidden="true" />
              Review: {reviewCount}
            </span>
          </div>
        </div>

        {/* Card */}
        {deck.cards.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No cards yet"
            description="Add your first card to start studying this deck."
            cta={{ label: "Add a card", onClick: () => setMode("edit") }}
          />
        ) : (
          <div className="relative perspective-1000 min-h-[20rem]">
            {!showingAnswer ? (
              <div
                className="w-full max-w-xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 text-center"
              >
                <span className="inline-flex items-center rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-300 mb-3">
                  Question {currentIndex + 1} of {order.length}
                </span>
                <h3 className="font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
                  {currentCard?.front}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Tap or click to reveal the answer.
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={prevCard}
                    disabled={order.length <= 1}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowingAnswer(true)}
                    className="rounded-xl bg-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
                  >
                    Reveal answer
                  </button>
                  <button
                    type="button"
                    onClick={nextCard}
                    disabled={order.length <= 1}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next<ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="w-full max-w-xl mx-auto rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 text-center"
              >
                <span className="inline-flex items-center rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-300 mb-3">
                  Answer {currentIndex + 1} of {order.length}
                </span>
                <h3 className="font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
                  {currentCard?.back}
                </h3>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => markCard(currentCard!, "know")}
                    disabled={workingCard === currentCard?.id}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {workingCard === currentCard?.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden="true" />
                    ) : (
                      <Check className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    )}
                    Know it
                  </button>
                  <button
                    type="button"
                    onClick={() => markCard(currentCard!, "review")}
                    disabled={workingCard === currentCard?.id}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Review again
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowingAnswer(false)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Back to question
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {studyError ? (
          <div role="alert" className={`mt-4 ${bannerClasses}`}>
            {studyError}
          </div>
        ) : null}
      </div>
    );
  };

  // -------- Edit view --------

  const renderEdit = () => {
    if (!deck) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Edit cards
          </h2>
          <button
            type="button"
            onClick={() => setMode("study")}
            className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Back to study
          </button>
        </div>

        {editError ? (
          <div role="alert" className={`mb-3 ${bannerClasses}`}>{editError}</div>
        ) : null}

        {/* Add card form */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            Add a card
          </h3>
          <form onSubmit={addCard} className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClasses}>Question (front)</label>
              <input
                type="text"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="e.g. What is photosynthesis?"
                className={inputClasses}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClasses}>Answer (back)</label>
              <input
                type="text"
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="e.g. The process by which plants convert light to energy."
                className={inputClasses}
              />
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-end gap-2">
              <button
                type="submit"
                disabled={!newFront.trim() || !newBack.trim()}
                className={primaryButtonClasses}
              >
                Add card
              </button>
            </div>
          </form>
        </section>

        {/* Card list */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            Your cards ({deck.cards.length})
          </h3>
          {deck.cards.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No cards yet. Add one above.
            </p>
          ) : (
            <div className="space-y-2">
              {deck.cards.map((card) => {
                const isEditing = editingCard?.id === card.id;
                const status = progress[card.id];
                return (
                  <div
                    key={card.id}
                    className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {isEditing ? (
                      <form onSubmit={saveEdit} className="space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={editFront}
                            onChange={(e) => setEditFront(e.target.value)}
                            defaultValue={card.front}
                            className={inputClasses}
                          />
                          <input
                            type="text"
                            value={editBack}
                            onChange={(e) => setEditBack(e.target.value)}
                            defaultValue={card.back}
                            className={inputClasses}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="rounded-xl bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCard(null);
                              setEditFront("");
                              setEditBack("");
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {card.front}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {card.back}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {status ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                                status === "know"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300"
                              }`}
                            >
                              {status === "know" ? "Know it" : "Review again"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-zinc-400 border-zinc-200 dark:border-zinc-700 dark:text-zinc-500">
                              Not studied
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCard(card);
                              setEditFront(card.front);
                              setEditBack(card.back);
                            }}
                            aria-label={`Edit ${card.front}`}
                            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            <Edit2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCard(card)}
                            aria-label={`Delete ${card.front}`}
                            className="rounded-lg p-1 text-zinc-400 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      )}
                    </div>
                    )})}
                  </div>)
                }
              </section>
      </div>
    );
  };

  const content = loading
    ? renderLoading()
    : loadError
      ? renderEmpty()
      : mode === "study"
        ? renderStudy()
        : renderEdit();

  return (
    <DashboardShell name="Student">
      {!deck ? null : (
        <>
          <Reveal direction="up">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <Link
                  href="/dashboard/flashcards"
                  className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  ← Your decks
                </Link>
                <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                  {deck.title}
                </h1>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openRename}
                  disabled={renaming}
                  className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 disabled:opacity-60"
                >
                  Rename deck
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingDeck(true)}
                  disabled={deletingDeck}
                  className="text-xs font-medium text-red-600 underline underline-offset-2 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-60"
                >
                  Delete deck
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal direction="up" delay={0.08}>
            <div className="mt-8">{content}</div>
          </Reveal>

          {/* Rename deck dialog */}
          <Dialog
            open={renaming}
            onClose={() => setRenaming(false)}
            title="Rename deck"
            description={`Change the title of “${deck.title}".`}
          >
            <form onSubmit={saveRename} noValidate>
              {renameError ? (
                <div role="alert" className={`mb-4 ${bannerClasses}`}>
                  {renameError}
                </div>
              ) : null}
              <label className={labelClasses}>Deck title</label>
              <input
                type="text"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                defaultValue={deck.title}
                className={inputClasses}
              />
              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  disabled={renaming}
                  className={secondaryButtonClasses}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming}
                  className={primaryButtonClasses}
                >
                  {renaming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Save
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </Dialog>

          {/* Delete deck confirmation dialog */}
          <Dialog
            open={deletingDeck}
            onClose={() => setDeletingDeck(false)}
            title="Delete deck"
            description={
              deletingDeck === true
                ? `Delete “${deck.title}" and all of its cards? This cannot be undone.`
                : undefined
            }
          >
            {deleteError ? (
              <div role="alert" className={`mb-4 ${bannerClasses}`}>
                {deleteError}
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeletingDeck(false)}
                disabled={deletingDeck === true}
                className={secondaryButtonClasses}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDeck}
                disabled={deletingDeck === true}
                className={DANGER_BUTTON_CLASSES}
              >
                {deletingDeck === true ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Deleting…
                  </>
                ) : (
                  "Delete deck"
                )}
              </button>
            </div>
          </Dialog>
        </>
      )}
    </DashboardShell>
  );
}
