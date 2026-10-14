/**
 * Study-timer persistence lives in `localStorage`, keyed per user so that
 * signing into a shared browser never restores another student's running
 * session. The legacy unscoped key is cleaned up on logout too.
 */

const TIMER_STORAGE_PREFIX = "aced-study-timer";

export function studyTimerStorageKey(userId: string | null): string {
  return `${TIMER_STORAGE_PREFIX}:${userId ?? "anon"}`;
}

/**
 * Remove every study-timer key (scoped, per-user, and the legacy unscoped one).
 * Called from the client when a user signs out.
 */
export function clearStudyTimerStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (
        key === TIMER_STORAGE_PREFIX ||
        (key !== null && key.startsWith(`${TIMER_STORAGE_PREFIX}:`))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable (private mode, quota); nothing to clean up.
  }
}
