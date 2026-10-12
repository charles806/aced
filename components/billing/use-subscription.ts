"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";

export type SubscriptionState = {
  isPro: boolean;
  status: string;
  plan: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type SubscriptionPayload = {
  subscription: SubscriptionState | null;
};

type UseSubscriptionOptions = {
  /** Called when the API reports the session is unauthenticated/expired. */
  onUnauthorized?: () => void;
  /**
   * Poll every `intervalMs` milliseconds while truthy. Used after checkout
   * completion to ride out webhook-propagation lag (never trust query params).
   * Passing `undefined` (or flipping a value used to build it) stops polling.
   */
  intervalMs?: number;
};

/**
 * Session-wide cache: the subscription is fetched once and every later
 * `useSubscription()` mount reads the cache instead of hitting the network.
 * Concurrent mounts share a single in-flight request.
 */
let cache: { subscription: SubscriptionState | null } | null = null;
let inflight: Promise<ApiResult<SubscriptionPayload>> | null = null;

function fetchSubscription(): Promise<ApiResult<SubscriptionPayload>> {
  if (!inflight) {
    inflight = apiRequest<SubscriptionPayload>(
      "/api/billing/subscription",
    ).finally(() => {
      inflight = null;
    });
  }

  return inflight;
}

/**
 * Live billing state for the current user, refreshed from
 * `GET /api/billing/subscription`. `subscription` is `null` for a free user
 * with no row yet. Polling is optional (the success/cancelled pages rely on it
 * to confirm activation once the provider webhook lands).
 */
export function useSubscription({
  onUnauthorized,
  intervalMs,
}: UseSubscriptionOptions = {}) {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(
    cache?.subscription ?? null,
  );
  const [loaded, setLoaded] = useState(cache !== null);

  // `onUnauthorized` is an inline arrow at most call sites, so it changes
  // identity on every render. Holding it in a ref keeps the fetch effect
  // below from re-running (which was causing a fetch-per-render loop).
  const onUnauthorizedRef = useRef(onUnauthorized);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    let active = true;

    const apply = (result: ApiResult<SubscriptionPayload>) => {
      if (!active) return;

      if (!result.ok) {
        if (result.failure.kind === "unauthorized") {
          onUnauthorizedRef.current?.();
        }
        // A failed check is still a finished check — never spin forever.
        setLoaded(true);
        return;
      }

      cache = { subscription: result.data.subscription };
      setSubscription(result.data.subscription);
      setLoaded(true);
    };

    // Polling always hits the network; the one-shot path uses the cache.
    if (intervalMs) {
      void fetchSubscription().then(apply);
      const timer = setInterval(() => void fetchSubscription().then(apply), intervalMs);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }

    if (cache) {
      setSubscription(cache.subscription);
      setLoaded(true);
      return;
    }

    void fetchSubscription().then(apply);

    return () => {
      active = false;
    };
  }, [intervalMs]);

  const refresh = useCallback(async () => {
    const result = await fetchSubscription();

    if (!result.ok) {
      if (result.failure.kind === "unauthorized") {
        onUnauthorizedRef.current?.();
      }
      setLoaded(true);
      return;
    }

    cache = { subscription: result.data.subscription };
    setSubscription(result.data.subscription);
    setLoaded(true);
  }, []);

  return { subscription, loaded, refresh };
}
