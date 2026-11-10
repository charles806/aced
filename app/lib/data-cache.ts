"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { apiRequest, type ApiResult } from "./api-client";
import { createElement } from "react";

// ============================================================================
// Types
// ============================================================================

type CacheKey = string; // endpoint + queryParams (e.g., "/api/subject" or "/api/notes?subjectId=abc")

interface CacheEntry<T> {
  data: T;
  lastFetched: number; // Date.now()
  status: "loading" | "ready" | "error";
  error?: string;
  unauthorized?: boolean;
}

interface PendingRequest<T> {
  promise: Promise<ApiResult<T>>;
  resolve: (result: ApiResult<T>) => void;
  reject: (error: Error) => void;
}

interface CacheState {
  entries: Map<CacheKey, CacheEntry<unknown>>;
  pending: Map<CacheKey, PendingRequest<unknown>>;
}

type CacheAction =
  | { type: "FETCH_START"; key: CacheKey }
  | { type: "FETCH_SUCCESS"; key: CacheKey; data: unknown }
  | { type: "FETCH_ERROR"; key: CacheKey; error: string; unauthorized: boolean }
  | { type: "INVALIDATE"; key: CacheKey }
  | { type: "INVALIDATE_PREFIX"; prefix: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_ENTRY"; key: CacheKey; entry: CacheEntry<unknown> };

// ============================================================================
// Reducer
// ============================================================================

const STALE_TTL_MS = 30_000; // 30 seconds - data considered fresh for this long

function cacheReducer(state: CacheState, action: CacheAction): CacheState {
  const newEntries = new Map(state.entries);
  const newPending = new Map(state.pending);

  switch (action.type) {
    case "FETCH_START": {
      newEntries.set(action.key, {
        data: undefined as never,
        lastFetched: 0,
        status: "loading",
      });
      break;
    }
    case "FETCH_SUCCESS": {
      newEntries.set(action.key, {
        data: action.data,
        lastFetched: Date.now(),
        status: "ready",
      });
      newPending.delete(action.key);
      break;
    }
    case "FETCH_ERROR": {
      newEntries.set(action.key, {
        data: undefined as never,
        lastFetched: Date.now(),
        status: "error",
        error: action.error,
        unauthorized: action.unauthorized,
      });
      newPending.delete(action.key);
      break;
    }
    case "INVALIDATE": {
      newEntries.delete(action.key);
      break;
    }
    case "INVALIDATE_PREFIX": {
      for (const key of newEntries.keys()) {
        if (key.startsWith(action.prefix)) {
          newEntries.delete(key);
        }
      }
      break;
    }
    case "CLEAR_ALL": {
      newEntries.clear();
      newPending.clear();
      break;
    }
    case "SET_ENTRY": {
      newEntries.set(action.key, action.entry);
      break;
    }
  }

  return { entries: newEntries, pending: newPending };
}

// ============================================================================
// Context & Provider
// ============================================================================

interface DataCacheContextValue {
  get: <T>(key: CacheKey, fetcher: () => Promise<ApiResult<T>>, options?: {
    ttlMs?: number;
    dedupe?: boolean;
  }) => Promise<{ data: T | undefined; status: "loading" | "ready" | "error"; error?: string; unauthorized?: boolean }>;
  invalidate: (key: CacheKey) => void;
  invalidatePrefix: (prefix: string) => void;
  clearAll: () => void;
  getEntry: <T>(key: CacheKey) => CacheEntry<T> | undefined;
}

const DataCacheContext = createContext<DataCacheContextValue | null>(null);

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cacheReducer, { entries: new Map(), pending: new Map() });

  // Get or create a cache entry, with deduplication and TTL
  const get = useCallback(
    async <T>(
      key: CacheKey,
      fetcher: () => Promise<ApiResult<T>>,
      options: { ttlMs?: number; dedupe?: boolean } = {}
    ) => {
      const { ttlMs = STALE_TTL_MS, dedupe = true } = options;
      const now = Date.now();

      // Check existing cache entry
      const existing = state.entries.get(key) as CacheEntry<T> | undefined;
      if (existing && existing.status === "ready") {
        const isStale = now - existing.lastFetched > ttlMs;
        if (!isStale) {
          // Fresh cache hit - return immediately
          return { data: existing.data, status: "ready" as const };
        }
        // Stale - will revalidate in background but return stale data immediately
      }

      // Check for pending request (deduplication)
      if (dedupe) {
        const pending = state.pending.get(key) as PendingRequest<T> | undefined;
        if (pending) {
          try {
            const result = await pending.promise;
            if (result.ok) {
              return { data: result.data, status: "ready" as const };
            }
            return { data: undefined, status: "error" as const, error: result.failure.message, unauthorized: result.failure.kind === "unauthorized" };
          } catch {
            // Fall through to fetch
          }
        }
      }

      // Start new fetch
      let resolvePromise: (result: ApiResult<T>) => void;
      let rejectPromise: (error: Error) => void;
      const promise = new Promise<ApiResult<T>>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });

      dispatch({ type: "FETCH_START", key });
      state.pending.set(key, { promise, resolve: resolvePromise!, reject: rejectPromise! });

      try {
        const result = await fetcher();
        if (result.ok) {
          dispatch({ type: "FETCH_SUCCESS", key, data: result.data });
          resolvePromise!(result);
          return { data: result.data, status: "ready" as const };
        } else {
          dispatch({ type: "FETCH_ERROR", key, error: result.failure.message, unauthorized: result.failure.kind === "unauthorized" });
          resolvePromise!(result);
          return { data: undefined, status: "error" as const, error: result.failure.message, unauthorized: result.failure.kind === "unauthorized" };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        dispatch({ type: "FETCH_ERROR", key, error: message, unauthorized: false });
        rejectPromise!(error instanceof Error ? error : new Error(message));
        return { data: undefined, status: "error" as const, error: message, unauthorized: false };
      }
    },
    [state.entries, state.pending]
  );

  const invalidate = useCallback((key: CacheKey) => {
    dispatch({ type: "INVALIDATE", key });
  }, []);

  const invalidatePrefix = useCallback((prefix: string) => {
    dispatch({ type: "INVALIDATE_PREFIX", prefix });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const getEntry = useCallback(<T>(key: CacheKey): CacheEntry<T> | undefined => {
    return state.entries.get(key) as CacheEntry<T> | undefined;
  }, [state.entries]);

  const value: DataCacheContextValue = {
    get,
    invalidate,
    invalidatePrefix,
    clearAll,
    getEntry,
  };

  return createElement(DataCacheContext.Provider, { value }, children);
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error("useDataCache must be used within a DataCacheProvider");
  }
  return context;
}

// ============================================================================
// Helper: Build cache key from endpoint + query params
// ============================================================================

export function buildCacheKey(endpoint: string, params?: Record<string, string | number | boolean | undefined>): CacheKey {
  if (!params) return endpoint;
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      searchParams.set(k, String(v));
    }
  }
  const query = searchParams.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

// ============================================================================
// Hook for listening to logout/user-switch events
// ============================================================================

export function useCacheClearOnAuthChange() {
  const { clearAll } = useDataCache();

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Clear cache when auth token is removed (logout) or changed (user switch)
      if (event.key === "radon-session" || event.key === "radon-auth") {
        clearAll();
      }
    };

    // Also listen for custom event dispatched on logout
    const handleAuthChange = () => clearAll();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("aced:auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("aced:auth-change", handleAuthChange);
    };
  }, [clearAll]);
}

// Dispatch this event on logout/user switch
export function dispatchAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("aced:auth-change"));
  }
}