"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { apiRequest } from "@/app/lib/api-client";
import { TutorText } from "@/components/tutor/tutor-format";

export type SummaryLengthOption = "short" | "detailed";

type SummaryPayload = {
  summary: string | null;
  summaryStatus: string | null;
  summaryUpdatedAt: string | null;
  summaryLength: string | null;
  stale: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; pro: boolean }
  | { status: "ready"; data: SummaryPayload };

const errorBannerClasses =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300";

const proBannerClasses =
  "rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-300";

function lengthLabel(length: string | null): string {
  return length === "short" ? "Short" : "Detailed";
}

export function NoteSummary({
  noteId,
  initialLength = "detailed",
}: {
  noteId: string;
  initialLength?: SummaryLengthOption;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [length, setLength] = useState<SummaryLengthOption>(initialLength);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setActionError(null);

    // apiRequest normalizes non-2xx into failure kinds; 403/409 surface as
    // generic "server" with the curated backend message lost, so use fetch
    // directly to preserve status + error text for upsell / retry states.
    let response: Response;

    try {
      response = await fetch(`/api/notes/${noteId}/summary`);
    } catch {
      setState({
        status: "error",
        message: "We couldn't load the summary. Please try again.",
        pro: false,
      });
      return;
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as Record<string, unknown>).error === "string"
          ? (payload as { error: string }).error
          : "We couldn't load the summary. Please try again.";

      if (response.status === 403) {
        setState({ status: "error", message, pro: true });
        return;
      }

      setState({ status: "error", message, pro: false });
      return;
    }

    const data = payload as SummaryPayload;

    if (data.summaryLength === "short" || data.summaryLength === "detailed") {
      setLength(data.summaryLength);
    }

    setState({ status: "ready", data });
  }, [noteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async (opts: { force: boolean; length: SummaryLengthOption }) => {
    if (working) return;
    setWorking(true);
    setActionError(null);

    const result = await apiRequest<SummaryPayload>(`/api/notes/${noteId}/summary`, {
      method: "POST",
      json: { force: opts.force, length: opts.length },
    });

    setWorking(false);

    if (!result.ok) {
      setActionError(result.failure.message);
      return;
    }

    if (
      result.data.summaryLength === "short" ||
      result.data.summaryLength === "detailed"
    ) {
      setLength(result.data.summaryLength);
    }

    setState({ status: "ready", data: result.data });
  };

  const switchLength = (next: SummaryLengthOption) => {
    setLength(next);

    if (state.status !== "ready") return;

    // Same-length completed + fresh cache needs no model call.
    if (
      state.data.summaryStatus === "completed" &&
      !state.data.stale &&
      state.data.summaryLength === next
    ) {
      return;
    }

    void generate({ force: false, length: next });
  };

  return (
    <section
      aria-label="AI summary"
      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          AI Summary
        </h3>

        <div
          role="group"
          aria-label="Summary length"
          className="inline-flex rounded-lg border border-zinc-200 p-0.5 text-xs font-medium dark:border-zinc-700"
        >
          {(["short", "detailed"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => switchLength(option)}
              disabled={working}
              aria-pressed={length === option}
              className={`rounded-md px-2.5 py-1 transition ${
                length === option
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {option === "short" ? "Short" : "Detailed"}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" ? (
        <div role="status" aria-label="Loading summary" className="mt-3 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : null}

      {state.status === "error" ? (
        state.pro ? (
          <div className={`mt-3 ${proBannerClasses}`}>
            <p>{state.message}</p>
            <Link
              href="/pricing"
              className="mt-1 inline-block font-medium underline underline-offset-2"
            >
              Upgrade to ACED Pro
            </Link>
          </div>
        ) : (
          <div className={`mt-3 ${errorBannerClasses}`} role="alert">
            {state.message}
          </div>
        )
      ) : null}

      {state.status === "ready" ? (
        <div className="mt-3">
          {state.data.summaryStatus === "completed" && state.data.summary ? (
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {lengthLabel(state.data.summaryLength)}
                </span>
                {state.data.stale ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    Outdated — note changed
                  </span>
                ) : null}
              </div>

              <div className="mt-2 text-zinc-700 dark:text-zinc-300">
                <TutorText text={state.data.summary} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generate({ force: true, length })}
                  disabled={working}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {working ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  Regenerate
                </button>
                <Link
                  href={`/dashboard/ai-tutor?noteId=${noteId}`}
                  className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Ask Tutor about this
                </Link>
              </div>
            </div>
          ) : state.data.summaryStatus === "pending" || working ? (
            <div role="status" aria-label="Generating summary" className="space-y-2">
              <p className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generating summary…
              </p>
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ) : state.data.summaryStatus === "failed" ? (
            <div className={errorBannerClasses} role="alert">
              <p>Summary unavailable right now. Please try again.</p>
              <button
                type="button"
                onClick={() => void generate({ force: true, length })}
                disabled={working}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {working ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Retry
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Get a concise summary of this note.
              </p>
              <button
                type="button"
                onClick={() => void generate({ force: false, length })}
                disabled={working}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 disabled:opacity-50"
              >
                {working ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                Generate {length === "short" ? "short" : "detailed"} summary
              </button>
            </div>
          )}

          {actionError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
