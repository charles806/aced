"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SettingsNotice } from "./settings-banner";

export function useSettingsNotice(timeoutMs = 5000) {
  const [notice, setNotice] = useState<SettingsNotice>(null);
  const timerRef = useRef<number | null>(null);

  const show = useCallback(
    (next: NonNullable<SettingsNotice>) => {
      setNotice(next);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setNotice(null);
        timerRef.current = null;
      }, timeoutMs);
    },
    [timeoutMs]
  );

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotice(null);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    []
  );

  return { notice, show, clear };
}