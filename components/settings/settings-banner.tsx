"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export type SettingsNotice =
  | { kind: "success" | "error"; message: string }
  | null;

export function SettingsBanner({
  notice,
  onDismiss,
  className = "",
}: {
  notice: SettingsNotice;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!notice) return null;

  const isSuccess = notice.kind === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${className} ${
        isSuccess
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-red-300 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      ) : (
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      )}
      <p className="flex-1">{notice.message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-current/70 transition hover:text-current focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}