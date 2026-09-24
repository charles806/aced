"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/app/lib/api-client";
import { Switch } from "./switch";
import { SettingsBanner } from "./settings-banner";
import { useSettingsNotice } from "./use-settings-notice";
import type {
  NotificationSettings,
  NotificationPreferenceKey,
} from "./types";

type NotificationSectionProps = {
  settings: NotificationSettings;
  onUnauthorized: () => void;
};

const ROWS: {
  key: NotificationPreferenceKey;
  title: string;
  description: string;
}[] = [
  {
    key: "studyReminders",
    title: "Study reminders",
    description: "A gentle nudge to keep up with your study sessions.",
  },
  {
    key: "productUpdates",
    title: "Product updates",
    description: "News about new ACED features and improvements.",
  },
  {
    key: "emailNotifications",
    title: "Email notifications",
    description: "Receive study and account updates by email.",
  },
];

export function NotificationSettings({
  settings: initialSettings,
  onUnauthorized,
}: NotificationSectionProps) {
  const [settings, setSettings] =
    useState<NotificationSettings>(initialSettings);
  const [savingKey, setSavingKey] = useState<NotificationPreferenceKey | null>(
    null
  );
  const { notice, show, clear } = useSettingsNotice();

  const handleChange = async (
    key: NotificationPreferenceKey,
    checked: boolean
  ) => {
    if (savingKey) return;

    setSavingKey(key);
    clear();

    const result = await apiRequest<{ settings: NotificationSettings }>(
      "/api/me/settings",
      { method: "PATCH", json: { [key]: checked } }
    );

    if (!result.ok) {
      if (result.failure.kind === "unauthorized") {
        onUnauthorized();
        setSavingKey(null);
        return;
      }

      show({ kind: "error", message: result.failure.message });
      setSavingKey(null);
      return;
    }

    setSettings(result.data.settings);
    setSavingKey(null);
  };

  return (
    <div>
      <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {ROWS.map((row) => {
          const saving = savingKey === row.key;

          return (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {row.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {row.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {saving ? (
                  <Loader2
                    className="h-4 w-4 animate-spin text-zinc-400"
                    aria-label="Saving…"
                  />
                ) : null}
                <Switch
                  checked={settings[row.key]}
                  disabled={saving}
                  onChange={(checked) => void handleChange(row.key, checked)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {notice ? (
        <SettingsBanner notice={notice} onDismiss={clear} className="mt-3" />
      ) : null}
    </div>
  );
}