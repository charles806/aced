"use client";

import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FreeAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => Promise<void>;
}

export function FreeAnnouncementModal({
  isOpen,
  onClose,
  onDismiss,
}: FreeAnnouncementModalProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleDismiss = async () => {
    setIsDismissing(true);
    await onDismiss();
    onClose();
  };

  // Handle keyboard navigation and focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal's close button
    setTimeout(() => {
      focusRef.current?.focus();
    }, 100);

    // Handle escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Focus trap
    const handleFocus = (event: FocusEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        event.stopPropagation();
        focusRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocus);

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocus);
      document.body.style.overflow = "";
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="free-announcement-title"
            aria-describedby="free-announcement-message"
          >
            <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Dismiss announcement"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              {/* Content */}
              <div className="text-center">
                {/* Sparkles icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-pink-500"
                  aria-hidden="true"
                >
                  <Sparkles className="h-8 w-8 text-white" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  id="free-announcement-title"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  WAIT... YOU DON'T HAVE TO PAY?! 😭
                </motion.h2>

                {/* Message */}
                <motion.p
                  id="free-announcement-message"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400"
                >
                  Plot twist! ACED is now 100% FREE.
                  <br /><br />
                  Yes, EVERYTHING.
                  <br /><br />
                  No Pro subscriptions. No paywalls. No hidden premium features.
                  <br /><br />
                  Just you, your notes, AI, and better studying.
                  <br /><br />
                  We decided that students deserve good study tools without another subscription draining their pockets. 😂
                </motion.p>

                {/* CTA Button */}
                <motion.button
                  ref={focusRef}
                  type="button"
                  onClick={handleDismiss}
                  disabled={isDismissing}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-base font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-lg hover:shadow-accent-500/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-wait disabled:opacity-70"
                >
                  <Rocket className="h-5 w-5" aria-hidden="true" />
                  {isDismissing ? "Saving..." : "LET'S GOOOO! 🚀"}
                </motion.button>

                {/* Subtle note */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="mt-4 text-xs text-zinc-400 dark:text-zinc-500"
                >
                  This announcement appears once. Welcome to free ACED! ✨
                </motion.p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}