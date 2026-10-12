"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { TutorText } from "./tutor-format";

export type TutorRole = "user" | "assistant";

const EASE = [0.22, 1, 0.36, 1] as const;

const avatarClasses =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold";

function initialsFor(name: string | null | undefined): string {
  if (!name) return "Y";

  const trimmed = name.trim();

  if (trimmed === "") return "Y";

  const first = trimmed[0];

  return first ? first.toUpperCase() : "Y";
}

export function TutorMessage({
  role,
  content,
  streaming = false,
  studentName,
}: {
  role: TutorRole;
  content: string;
  /** The last assistant bubble animates a caret while text is still arriving. */
  streaming?: boolean;
  studentName?: string | null;
}) {
  const reduced = useReducedMotion();
  const isUser = role === "user";

  const bubble = (
    <div
      className={`flex w-full gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {isUser ? null : (
        <span
          aria-hidden="true"
          className={`${avatarClasses} bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400`}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      )}

      <div
        className={`relative min-w-0 ${
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-accent-500 px-3.5 py-2.5 text-white shadow-sm shadow-accent-500/25 sm:max-w-[75%]"
            : "paper-grain max-w-[92%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_8px_24px_-20px_rgba(24,24,27,0.18)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_8px_24px_-20px_rgba(0,0,0,0.6)] sm:max-w-[85%]"
        }`}
      >
        <span className="sr-only">{isUser ? "You asked" : "ACED Tutor replied"}</span>

        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed [overflow-wrap:anywhere]">
            {content}
          </p>
        ) : (
          <>
            <div className="text-zinc-700 dark:text-zinc-300">
              <TutorText text={content} />
            </div>
            {streaming ? (
              <span
                aria-hidden="true"
                className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent-600 dark:text-accent-400 ${
                  reduced ? "" : "animate-pulse"
                }`}
              >
                <Sparkles className="h-3 w-3" strokeWidth={2} />
                Writing…
              </span>
            ) : null}
          </>
        )}
      </div>

      {isUser ? (
        <span
          aria-hidden="true"
          className={`${avatarClasses} bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`}
        >
          {initialsFor(studentName)}
        </span>
      ) : null}
    </div>
  );

  if (reduced) return bubble;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="list-none"
    >
      {bubble}
    </motion.li>
  );
}