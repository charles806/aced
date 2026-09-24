"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "sv-theme";

function readStoredMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable — fall through to "system".
  }

  return "system";
}

function readSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemDark, setSystemDark] = useState<boolean>(false);

  // Load the stored preference and system dark after first paint so server
  // HTML matches during hydration (both start with dark=false, mode="system").
  useEffect(() => {
    setSystemDark(readSystemDark());
    const storedMode = readStoredMode();
    const frame = window.requestAnimationFrame(() =>
      setModeState(storedMode)
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Track the OS preference so "system" mode stays live.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const dark = mode === "system" ? systemDark : mode === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — the mode still applies for this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(dark ? "light" : "dark");
  }, [dark, setMode]);

  return { dark, mode, setMode, toggle };
}