"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";
import { useDataCache, buildCacheKey } from "@/app/lib/data-cache";

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
const FLASHCARDS_TTL_MS = 60_000; // 60 seconds

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

export function useFlashcards() {
  const { get, invalidate, getEntry } = useDataCache();
  const [state, setState] = useState<FlashcardsState>({ status: "loading" });

  const cacheKey = "/api/flashcards";

  const fetchDecks = useCallback(async (): Promise<ApiResult<DecksPayload>> => {
    return apiRequest<DecksPayload>(cacheKey, {
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

      const decks = Array.isArray(result.data?.decks) ? result.data.decks : [];

      setState({ status: "ready", decks });
    },
    []
  );

  useEffect(() => {
    let ignore = false;

    const cached = getEntry<DecksPayload>(cacheKey);
    if (cached && cached.status === "ready") {
      const isStale = Date.now() - cached.lastFetched > FLASHCARDS_TTL_MS;
      if (!isStale) {
        applyResult({ ok: true, data: cached.data });
        // Revalidate in background
        void get(cacheKey, fetchDecks, { ttlMs: FLASHCARDS_TTL_MS, dedupe: true }).then((res) => {
          if (!ignore && res.status === "ready" && res.data) {
            applyResult({ ok: true, data: res.data });
          }
        });
        return;
      }
    }

    void get(cacheKey, fetchDecks, { ttlMs: FLASHCARDS_TTL_MS, dedupe: true }).then((res) => {
      if (!ignore) {
        applyResult(toApiResult(res));
      }
    });

    return () => {
      ignore = true;
    };
  }, [get, getEntry, cacheKey, fetchDecks, applyResult]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void get(cacheKey, fetchDecks, { ttlMs: 0, dedupe: false }).then((res) => applyResult(toApiResult(res)));
  }, [get, cacheKey, fetchDecks, applyResult]);

  const setDecks = useCallback(
    (update: (previous: FlashcardDeck[]) => FlashcardDeck[]) => {
      setState((current) =>
        current.status === "ready"
          ? { status: "ready", decks: update(current.decks) }
          : current
      );
      invalidate(cacheKey);
    },
    [invalidate, cacheKey]
  );

  const addDeck = useCallback((deck: FlashcardDeck) => {
    setState((current) =>
      current.status === "ready"
        ? { status: "ready", decks: [deck, ...current.decks] }
        : current
    );
    invalidate(cacheKey);
  }, [invalidate, cacheKey]);

  const updateDeck = useCallback((deck: FlashcardDeck) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            decks: current.decks.map((item) => (item.id === deck.id ? deck : item)),
          }
        : current
    );
    invalidate(cacheKey);
  }, [invalidate, cacheKey]);

  const removeDeck = useCallback((deckId: string) => {
    setState((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            decks: current.decks.filter((item) => item.id !== deckId),
          }
        : current
    );
    invalidate(cacheKey);
  }, [invalidate, cacheKey]);

  return {
    state,
    reload,
    setDecks,
    addDeck,
    updateDeck,
    removeDeck,
  };
}