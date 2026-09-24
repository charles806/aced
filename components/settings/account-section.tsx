"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { apiRequest } from "@/app/lib/api-client";
import { logout } from "@/app/actions/auth";
import { SettingsBanner } from "./settings-banner";
import { useSettingsNotice } from "./use-settings-notice";
import type { UserProfile } from "./types";

type AccountSectionProps = {
  user: UserProfile;
  onUnauthorized: () => void;
};

const PASSWORD_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-400/40 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function AccountSection({ user, onUnauthorized }: AccountSectionProps) {
  const router = useRouter();
  const [sendingReset, setSendingReset] = useState(false);
  const { notice, show, clear } = useSettingsNotice();

  const joinedDate = (() => {
    const date = new Date(user.createdAt);
    return Number.isNaN(date.getTime())
      ? null
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
  })();

  const hasPasswordEmail = typeof user.email === "string" && user.email.length > 0;

  const handleSendReset = async () => {
    if (sendingReset || !hasPasswordEmail) return;

    setSendingReset(true);
    clear();

    const result = await apiRequest<{ sent?: boolean }>(
      "/api/auth/password/request-reset",
      { method: "POST", json: { email: user.email } }
    );

    if (!result.ok) {
      if (result.failure.kind === "unauthorized") {
        onUnauthorized();
        setSendingReset(false);
        return;
      }

      show({ kind: "error", message: result.failure.message });
      setSendingReset(false);
      return;
    }

    show({
      kind: "success",
      message:
        "If an account exists for your email, a password reset link is on its way.",
    });
    setSendingReset(false);
  };

  const handleSignOut = async () => {
    await logout();
    router.push("/signin");
  };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <dt className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Email
            </dt>
            <dd className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              {user.email ?? "Not provided"}
              {user.emailVerified ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Verified
                </span>
              ) : user.email ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Unverified
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <dt className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Member since
            </dt>
            <dd className="text-sm text-zinc-500 dark:text-zinc-400">
              {joinedDate ?? "Unknown"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-4 sm:flex-row dark:border-zinc-800">
          <button
            type="button"
            onClick={() => void handleSendReset()}
            disabled={sendingReset || !hasPasswordEmail}
            className={`${PASSWORD_BUTTON_CLASSES} sm:flex-1`}
          >
            {sendingReset ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {sendingReset
              ? "Sending reset link…"
              : hasPasswordEmail
                ? "Change password"
                : "No password on this account"}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className={`${PASSWORD_BUTTON_CLASSES} border-red-200 text-red-600 hover:bg-red-50 focus-visible:ring-red-500/30 dark:border-red-400/40 dark:text-red-400 dark:hover:bg-red-950/30 sm:flex-1`}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>

      {notice ? (
        <SettingsBanner notice={notice} onDismiss={clear} className="mt-3" />
      ) : null}
    </div>
  );
}