"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useSubscription } from "./use-subscription";

type BillingStatusPanelProps = {
  view: "success" | "cancelled";
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

/**
 * Post-checkout confirmation panels.
 *
 * Never trust URL query params for entitlement — the panel fetches the real
 * billing state and, on the success page, polls until the provider webhook has
 * landed and activation shows up on `GET /api/billing/subscription`. If
 * delivery lags, it keeps watching rather than guessing.
 */
export function BillingStatusPanel({ view }: BillingStatusPanelProps) {
  const router = useRouter();
  const onUnauthorized = () => router.replace("/signin");

  const [proActivated, setProActivated] = useState(false);
  const { subscription, loaded, refresh } = useSubscription({
    onUnauthorized,
    intervalMs: view === "success" && !proActivated ? 1500 : undefined,
  });

  // Documented "adjust state during render" pattern (not an effect): stop
  // polling once activation is visible in real billing state.
  if (subscription?.hasProAccess && !proActivated) {
    setProActivated(true);
  }

  const periodEnd = formatPeriodEnd(subscription?.currentPeriodEnd ?? null);

  if (view === "success") {
    if (subscription?.hasProAccess) {
      return (
        <StatusCard
          icon={
            <CheckCircle2
              className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          }
          title="Welcome to ACED Pro"
          description={
            periodEnd
              ? `Your ACED Pro subscription is active, with the next billing on ${periodEnd}.`
              : "Your ACED Pro subscription is active. Thanks for upgrading!"
          }
          footer={
            <>
              {subscription.cancelAtPeriodEnd ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Renewal is canceled; access continues until the period ends.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
                >
                  Go to dashboard
                </Link>
              </div>
            </>
          }
        />
      );
    }

    return (
      <StatusCard
        icon={
          <Loader2
            className="h-6 w-6 animate-spin text-accent-500"
            aria-hidden="true"
          />
        }
        title={
          loaded ? "Still confirming your subscription…" : "Confirming your subscription…"
        }
        description={
          loaded
            ? "Your payment may have been received, but the confirmation hasn't reached us yet. Webhooks can take a minute — keep this page open, or check back shortly."
            : "We're checking the status of your upgrade. It can take a minute for the subscription to activate."
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-400/40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Back to dashboard
            </Link>
          </div>
        }
      />
    );
  }

  // view === "cancelled"
  if (subscription?.hasProAccess) {
    return (
      <StatusCard
        icon={
          <CheckCircle2
            className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        }
        title="Checkout canceled — you're still on Pro"
        description="No changes were made and you weren't charged again. Your Pro membership is exactly as it was before."
        footer={
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
          >
            Go to dashboard
          </Link>
        }
      />
    );
  }

  return (
    <StatusCard
      icon={
        <XCircle className="h-6 w-6 text-zinc-400" aria-hidden="true" />
      }
      title="Checkout canceled"
      description="You weren't charged and your checkout was discarded. Whenever you're ready to upgrade, it's a couple of taps away."
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40"
          >
            Upgrade to Pro
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Back to dashboard
          </Link>
        </div>
      }
    />
  );
}

function StatusCard({
  icon,
  title,
  description,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        {icon}
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}