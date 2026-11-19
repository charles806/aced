"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/dashboard/dialog";
import { SettingsBanner } from "./settings-banner";
import { useSettingsNotice } from "./use-settings-notice";

type DangerZoneProps = {
  name: string;
};

const DESTRUCTIVE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-600/30 transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60";

export function DangerZone({ name }: DangerZoneProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { notice, show } = useSettingsNotice();

  const confirmDisabled = typedName.trim() !== name.trim();

  const openDialog = () => {
    setTypedName("");
    setFieldError(null);
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (confirmDisabled) {
      setFieldError("Enter your name to confirm");
      return;
    }

    setDialogOpen(false);
    setTypedName("");
    setFieldError(null);

    // Account deletion has no backend endpoint yet. Surface the state
    // explicitly instead of pretending the action succeeded. This UI is
    // intentionally isolated so a secure deletion flow can be connected here.
    show({
      kind: "error",
      message:
        "Account deletion isn't available yet. Please contact support for help with your account.",
    });
  };

  return (
    <div>
      <div className="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-400/20 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Delete account
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Permanently remove your account and all of your data. This action
              cannot be undone.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openDialog}
          className={`${DESTRUCTIVE_CLASSES} mt-4`}
        >
          Delete account
        </button>
      </div>

      {notice ? (
        <SettingsBanner notice={notice} className="mt-3" />
      ) : null}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Delete your account?"
        description="This will permanently delete your account, subjects, notes, study history, and settings. There is no undo. Type your name to confirm."
      >
        <label
          htmlFor="danger-confirm-name"
          className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Type <span className="font-semibold">{name || "your name"}</span> to
          confirm
        </label>
        <input
          id="danger-confirm-name"
          type="text"
          value={typedName}
          onChange={(event) => {
            setTypedName(event.target.value);
            if (fieldError) setFieldError(null);
          }}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-4 dark:bg-zinc-900 dark:text-zinc-100 ${
            fieldError
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/10 dark:border-red-400/50"
              : "border-zinc-200 focus:border-accent-400 focus:ring-accent-500/10 dark:border-zinc-800"
          }`}
        />
        {fieldError ? (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {fieldError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDialogOpen(false)}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-400/40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={DESTRUCTIVE_CLASSES}
          >
            Permanently delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}