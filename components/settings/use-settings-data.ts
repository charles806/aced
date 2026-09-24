"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiFailure } from "@/app/lib/api-client";
import type { NotificationSettings, UserProfile } from "./types";

type LoadStatus = "loading" | "error" | "ready";

type SettingsLoadResult =
  | { ok: true; user: UserProfile; settings: NotificationSettings }
  | { ok: false; failure: ApiFailure };

export function useSettingsData({
  onUnauthorized,
}: {
  onUnauthorized: () => void;
}) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  const fetchData = useCallback(
    async (): Promise<SettingsLoadResult> => {
      const [meResult, settingsResult] = await Promise.all([
        apiRequest<{ user: UserProfile }>("/api/auth/me"),
        apiRequest<{ settings: NotificationSettings }>("/api/me/settings"),
      ]);

      if (!meResult.ok) {
        return { ok: false, failure: meResult.failure };
      }

      if (!settingsResult.ok) {
        return { ok: false, failure: settingsResult.failure };
      }

      return {
        ok: true,
        user: meResult.data.user,
        settings: settingsResult.data.settings,
      };
    },
    []
  );

  const apply = useCallback(
    (result: SettingsLoadResult) => {
      if (!result.ok) {
        if (result.failure.kind === "unauthorized") {
          onUnauthorized();
          return;
        }

        setStatus("error");
        setErrorMessage(result.failure.message);
        return;
      }

      setUser(result.user);
      setSettings(result.settings);
      setStatus("ready");
    },
    [onUnauthorized]
  );

  useEffect(() => {
    let ignore = false;

    void fetchData().then((result) => {
      if (!ignore) apply(result);
    });

    return () => {
      ignore = true;
    };
  }, [fetchData, apply]);

  const reload = useCallback(() => {
    setStatus("loading");
    setErrorMessage(null);
    void fetchData().then(apply);
  }, [fetchData, apply]);

  return { status, errorMessage, user, settings, reload };
}