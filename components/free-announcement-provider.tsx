"use client";

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from "react";
import { FreeAnnouncementModal } from "@/components/free-announcement-modal";
import { apiRequest } from "@/app/lib/api-client";

interface FreeAnnouncementContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dismiss: () => Promise<void>;
}

const FreeAnnouncementContext = createContext<FreeAnnouncementContextValue | null>(null);

export function useFreeAnnouncement() {
  const context = useContext(FreeAnnouncementContext);
  if (!context) {
    throw new Error("useFreeAnnouncement must be used within a FreeAnnouncementProvider");
  }
  return context;
}

interface FreeAnnouncementProviderProps {
  children: ReactNode;
}

const LOCAL_STORAGE_KEY = "aced_free_announcement_seen";
const ANNOUNCEMENT_VERSION = 1; // Increment this to force re-show

export function FreeAnnouncementProvider({ children }: FreeAnnouncementProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // Check if user has seen the announcement
  const checkAnnouncementStatus = useCallback(async () => {
    try {
      // First check localStorage for unauthenticated users or as fallback
      const localSeen = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localSeen) {
        const parsed = JSON.parse(localSeen);
        if (parsed.version === ANNOUNCEMENT_VERSION && parsed.seen) {
          return true;
        }
      }

      // Try to fetch from server for authenticated users
      const result = await apiRequest<{ settings: { seenFreeAnnouncement: boolean } }>("/api/me/settings");

      if (result.ok && result.data.settings) {
        setIsAuthenticated(true);
        return result.data.settings.seenFreeAnnouncement;
      }

      // If not authenticated (401), check localStorage again
      return false;
    } catch {
      // On error, assume not seen (will show once)
      return false;
    }
  }, []);

  // Dismiss the announcement
  const dismiss = useCallback(async () => {
    if (dismissing) return;
    setDismissing(true);

    try {
      // Always set localStorage immediately for instant feedback
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ version: ANNOUNCEMENT_VERSION, seen: true }));

      // Try to persist to server if authenticated
      if (isAuthenticated) {
        const result = await apiRequest<{ ok: boolean }>("/api/me/free-announcement", {
          method: "PATCH",
        });
        if (!result.ok) {
          console.warn("Failed to persist free announcement dismissal to server");
        }
      }
    } catch (error) {
      console.error("Failed to dismiss free announcement:", error);
      // localStorage is already set, so user won't see it again on this device
    } finally {
      setDismissing(false);
      setIsOpen(false);
    }
  }, [dismissing, isAuthenticated]);

  // Check on mount
  useEffect(() => {
    let mounted = true;

    checkAnnouncementStatus().then((seen) => {
      if (mounted && !seen) {
        setIsOpen(true);
      }
      if (mounted) {
        setIsChecking(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [checkAnnouncementStatus]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value: FreeAnnouncementContextValue = {
    isOpen,
    open,
    close,
    dismiss,
  };

  return (
    <FreeAnnouncementContext.Provider value={value}>
      {children}
      {!isChecking && (
        <FreeAnnouncementModal
          isOpen={isOpen}
          onClose={close}
          onDismiss={dismiss}
        />
      )}
    </FreeAnnouncementContext.Provider>
  );
}