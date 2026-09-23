"use client";

import { useState } from "react";
import { apiRequest } from "@/app/lib/api-client";

type CheckoutPayload = { checkoutUrl: string };

type UseCheckoutOptions = {
  /** Called when the API reports the session is unauthenticated/expired. */
  onUnauthorized?: () => void;
};

/**
 * Shared "Upgrade to Pro" flow: creates a Bachs checkout via the backend and
 * redirects the browser to the returned hosted checkout URL. On failure it
 * reports an error; the user is never marked as Pro from the client.
 */
export function useCheckout({ onUnauthorized }: UseCheckoutOptions = {}) {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    if (upgrading) return;

    setUpgrading(true);
    setError(null);

    const result = await apiRequest<CheckoutPayload>("/api/billing/checkout", {
      method: "POST",
      json: {},
    });

    setUpgrading(false);

    if (!result.ok) {
      if (result.failure.kind === "unauthorized") {
        onUnauthorized?.();
        return;
      }
      setError(result.failure.message);
      return;
    }

    // The checkout URL comes from the server; redirect the whole page to it.
    window.location.assign(result.data.checkoutUrl);
  };

  return { upgrading, error, startCheckout };
}