"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";

export type FlashcardDeck = {
  id: string;
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CardProgress = {
  cardId: string;
  status: string;
};

export type FlashcardDeckDetail = FlashcardDeck & {
  cards: Flashcard[];
  progress: CardProgress[];
};

export type FlashcardsState =
  | { status: "loading" }
  | { status: "error"; message: string; unauthorized: boolean }
  | { status: "ready"; decks: FlashcardDeck[] };

type DecksPayload = { decks: FlashcardDeck[] };

const LOAD_NOT_FOUND_FALLBACK = "Your flashcards could not be found.";

export function useFlashcards() {
  const [state, setState] = useState<FlashcardsState>({ status: "loading" });

  const fetchDecks = useCallback(async (): Promise<ApiResult<DecksPayload>> => {
    return apiRequest<DecksPayload>("/api/flashcards", {
      notFoundMessage: LOAD_NOT_FOUND_FALLBACK,
    });
  }, []);

  const applyResult = useCallback(
    (result: ApiResult<DecksPayload>) => {
      if (!result.ok) {
        setState({
          status: "error",
          message: result.failure.message,
          unauthorized: result.failure.kind === "unauthorized",
        });
        return;
      }

      const decks = Array.isArray(result.data?.decks)
        ? result.data.decks
        : [];

      setState({ status: "ready", decks });
    },
    []
  );

  useEffect(() => {
    let ignore = false;

    void fetchDecks().then((result) => {
      if (!ignore) applyResult(result);
    });

    return () => {
      ignore = true;
    };
  }, [fetchDecks, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void fetchDecks().then(applyResult);
  }, [fetchDecks, applyResult]);

  const setDecks = useCallback(
    (update: (previous: FlashcardDeck[]) => FlashcardDeck[]) => {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", decks: update(current.decks) }
          : current
      );
    },
    []
  );

  const addDeck = useCallback((deck: FlashcardDeck) => {
    setState((current) =>
      current.status === "ready"
        ? { status: "ready", decks: [deck, ...current.decks] }
        : current
    );
  }, []);

  const updateDeck = useCallback((deck: FlashcardDeck) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            decks: current.decks.map((item) =>
              item.id === deck.id ? deck : item
            ),
          }
        : current
    );
  }, []);

  const removeDeck = useCallback((deckId: string) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            decks: current.decks.filter((item) => item.id !== deckId),
          }
        : current
    );
  }, []);

  return {
    state,
    reload,
    setDecks,
    addDeck,
    updateDeck,
    removeDeck,
  };
}
