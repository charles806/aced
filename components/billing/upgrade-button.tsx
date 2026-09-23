"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useCheckout } from "./use-checkout";
import { useSubscription } from "./use-subscription";

type UpgradeButtonProps = {
  /** Called when the API reports the session is unauthenticated/expired. */
  onUnauthorized?: () => void;
};

/**
 * Compact "Pro" entry point (e.g. sidebar). Shows a read-only badge for users
 * who are already entitled and the upgrade button for everyone else.
 */
export function UpgradeButton({ onUnauthorized }: UpgradeButtonProps) {
  const { upgrading, error, startCheckout } = useCheckout({ onUnauthorized });
  const { subscription, loaded } = useSubscription({ onUnauthorized });

  if (loaded && subscription?.hasProAccess) {
    return (
      <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Pro active
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={upgrading}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:opacity-60"
      >
        {upgrading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        )}
        {upgrading ? "Starting checkout…" : "Upgrade to Pro"}
      </button>

      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs leading-relaxed text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}