"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useCheckout } from "./use-checkout";
import { useSubscription } from "./use-subscription";
import { apiRequest } from "@/app/lib/api-client";

type UpgradeCardProps = {
  onSignIn: () => void;
};

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

export function UpgradeCard({ onSignIn }: UpgradeCardProps) {
  const { upgrading, error: checkoutError, startCheckout } = useCheckout({
    onUnauthorized: onSignIn,
  });
  const { subscription, loaded, refresh } = useSubscription({
    onUnauthorized: onSignIn,
  });

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const planName = "ACED Pro";
  const periodEnd = formatPeriodEnd(subscription?.currentPeriodEnd ?? null);
  const [hasPro, isPastDue, renewalsCanceled] = [
    subscription?.isPro ?? false,
    subscription?.status === "past_due",
    subscription?.cancelAtPeriodEnd ?? false,
  ];

  const cancelPro = async () => {
    if (cancelling) return;

    if (
      !window.confirm(
        `Cancel ${planName}? You'll keep access through the end of your current billing period.`
      )
    ) {
      return;
    }

    setCancelling(true);
    setCancelError(null);

    const result = await apiRequest("/api/billing/cancel", {
      method: "POST",
      json: {},
    });

    if (!result.ok) {
      setCancelError(result.failure.message);
    } else {
      await refresh();
    }
    setCancelling(false);
  };

  const error = cancelError ?? checkoutError;

  return (
    <section
      aria-labelledby="upgrade-title"
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {!loaded ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking your account…
        </div>
      ) : hasPro ? (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="upgrade-title"
                className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {planName}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {renewalsCanceled
                  ? periodEnd
                    ? `Active until ${periodEnd} — renewals are canceled.`
                    : "Renewals are canceled; you keep access through your paid period."
                  : isPastDue
                    ? "A payment is being retried — your Pro continues in the meantime."
                    : periodEnd
                      ? `Active — next billing on ${periodEnd}.`
                      : "Active."}
              </p>
            </div>
          </div>

          {!renewalsCanceled ? (
            <button
              type="button"
              onClick={() => void cancelPro()}
              disabled={cancelling}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-400/40 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {cancelling ? "Canceling…" : "Cancel Pro"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="upgrade-title"
                className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {planName}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Unlock pro features — $1.99/month.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={upgrading}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:opacity-60"
          >
            {upgrading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {upgrading ? "Starting checkout…" : "Upgrade"}
          </button>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </section>
  );
}