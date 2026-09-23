"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiResult } from "@/app/lib/api-client";

export type SubscriptionState = {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasProAccess: boolean;
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
    null
  );
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback(
    (result: ApiResult<SubscriptionPayload>) => {
      if (!result.ok) {
        if (result.failure.kind === "unauthorized") {
          onUnauthorized?.();
        }
        return;
      }
      setSubscription(result.data.subscription);
      setLoaded(true);
    },
    [onUnauthorized],
  );

  const refresh = useCallback(async () => {
    const result = await apiRequest<SubscriptionPayload>(
      "/api/billing/subscription",
    );
    apply(result);
  }, [apply]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const result = await apiRequest<SubscriptionPayload>(
        "/api/billing/subscription",
      );
      if (active) apply(result);
    };

    void load();

    if (!intervalMs) return () => {
      active = false;
    };

    const timer = setInterval(() => void load(), intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [apply, intervalMs]);

  return { subscription, loaded, refresh };
}