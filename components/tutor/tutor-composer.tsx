"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cx } from "@/components/marketing/lib/cx";

const MAX_TEXTAREA_HEIGHT = 160;

export function TutorComposer({
  value,
  onChange,
  onSubmit,
  busy,
  disabled,
  noteTitle,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  disabled: boolean;
  noteTitle: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to a cap, then scroll inside the field. Keeps the
  // send button reachable on short viewports.
  useEffect(() => {
    const node = textareaRef.current;

    if (!node) return;

    node.style.height = "auto";

    const next = Math.min(node.scrollHeight, MAX_TEXTAREA_HEIGHT);

    node.style.height = `${next}px`;
    node.style.overflowY = node.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [value]);

  const canSend = !busy && !disabled && value.trim().length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline — the convention chat inputs
    // use. The hint below the field states it so it isn't a secret.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (canSend) onSubmit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (canSend) onSubmit();
      }}
      className="border-t border-zinc-200 bg-white/90 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 sm:p-4"
    >
      <label htmlFor="tutor-message" className="sr-only">
        {`Ask the ACED Tutor a question about ${noteTitle}`}
      </label>

      <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition focus-within:border-accent-400 focus-within:ring-4 focus-within:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:border-accent-400 dark:focus-within:ring-accent-500/20">
        <textarea
          id="tutor-message"
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-busy={busy}
          placeholder={noteTitle ? `Ask about ${noteTitle}…` : "Ask a question…"}
          className="max-h-40 min-h-[2.75rem] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-60 sm:text-[0.9375rem] dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label={busy ? "Waiting for the tutor" : "Send message"}
          className={cx(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40",
            canSend
              ? "bg-accent-500 text-white shadow-sm shadow-accent-500/30 hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-md hover:shadow-accent-500/30 active:scale-95"
              : "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden="true" strokeWidth={2.2} />
          )}
        </button>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
        Press Enter to send · Shift + Enter for a new line
      </p>
    </form>
  );
}