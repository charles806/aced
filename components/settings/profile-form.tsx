"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/app/lib/api-client";
import { SettingsBanner } from "./settings-banner";
import { useSettingsNotice } from "./use-settings-notice";
import type { UserProfile } from "./types";

type ProfileFormProps = {
  user: UserProfile;
  onNameUpdated: (name: string) => void;
  onUnauthorized: () => void;
};

const SAVE_CLASSES =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:opacity-60";

export function ProfileForm({
  user,
  onNameUpdated,
  onUnauthorized,
}: ProfileFormProps) {
  const displayName =
    typeof user.metadata.name === "string" && user.metadata.name.trim()
      ? user.metadata.name
      : "Student";

  const [name, setName] = useState(displayName);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { notice, show, clear } = useSettingsNotice();

  const avatarInitial = (displayName || "S").charAt(0).toUpperCase();
  const nameTooLong = name.trim().length > 100;

  const handleSave = async () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setFieldError("Name is required");
      return;
    }

    if (trimmed.length > 100) {
      setFieldError("Name must be 100 characters or fewer");
      return;
    }

    setFieldError(null);
    setSaving(true);
    clear();

    const result = await apiRequest<{ user: UserProfile }>("/api/me", {
      method: "PATCH",
      json: { name: trimmed },
    });

    if (!result.ok) {
      if (result.failure.kind === "unauthorized") {
        onUnauthorized();
        setSaving(false);
        return;
      }

      show({ kind: "error", message: result.failure.message });
      setSaving(false);
      return;
    }

    onNameUpdated(trimmed);
    show({ kind: "success", message: "Your name was updated." });
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-500 text-lg font-semibold text-white"
          aria-hidden="true"
        >
          {avatarInitial}
        </span>
        <div className="min-w-0 pt-1">
          <p className="truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
            {displayName}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {user.email ?? "Email not provided"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label
          htmlFor="profile-name"
          className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Name
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (fieldError) setFieldError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSave();
            }}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-4 dark:bg-zinc-900 dark:text-zinc-100 ${
              fieldError
                ? "border-red-300 focus:border-red-400 focus:ring-red-500/10 dark:border-red-400/50"
                : "border-zinc-200 focus:border-accent-400 focus:ring-accent-500/10 dark:border-zinc-800"
            }`}
          />
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={`${SAVE_CLASSES} sm:shrink-0`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        {fieldError ? (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {fieldError}
          </p>
        ) : nameTooLong ? (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            Name must be 100 characters or fewer
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            This is the name shown across your ACED account.
          </p>
        )}
      </div>

      {notice ? (
        <SettingsBanner notice={notice} onDismiss={clear} className="mt-4" />
      ) : null}
    </div>
  );
}