/**
 * Prompt layer for AI-generated note summaries.
 *
 * Mirrors the Tutor pattern (`TUTOR_INSTRUCTIONS` + `buildTutorInput` in
 * `app/api/ai/tutor/route.ts`): instructions + the student's note material as
 * trusted context. Summaries are persisted artifacts, so this module has no
 * streaming protocol — the route calls `generateText()` with `buildSummaryInput()`.
 */

export type SummaryLength = "short" | "detailed";

export const MAX_SUMMARY_CHARS = 12000;

const TRUNCATION_MARKER = "\n[truncated...]";

export const SUMMARY_INSTRUCTIONS_SHORT = `You are ACED's study summarizer. Summarize the student's own study material below.

Rules:
- Base the summary only on the material below. Never add facts from outside it.
- Reply with a TL;DR of 2-3 sentences, then exactly 5 key bullet points.
- Keep the whole summary under 150 words.
- Reply with markdown only. No preamble, no meta-commentary.
- If parts of the material look like OCR noise or are unreadable, flag that instead of guessing.`;

export const SUMMARY_INSTRUCTIONS_DETAILED = `You are ACED's study summarizer. Summarize the student's own study material below.

Rules:
- Base the summary only on the material below. Never add facts from outside it.
- Reply with a TL;DR paragraph, then a "Key points" section of 5-8 bullets, then a "Key terms" section of at most 8 terms (term — one-line definition).
- Keep the whole summary around 350 words.
- Reply with markdown only. No preamble, no meta-commentary.
- If parts of the material look like OCR noise or are unreadable, flag that instead of guessing.`;

export function summaryInstructionsFor(length: SummaryLength): string {
  return length === "short"
    ? SUMMARY_INSTRUCTIONS_SHORT
    : SUMMARY_INSTRUCTIONS_DETAILED;
}

/**
 * Keeps a single note from becoming an unbounded prompt.
 * Slices overlong text and appends a marker so the model knows input was cut.
 */
export function truncateForSummary(text: string): string {
  if (text.length <= MAX_SUMMARY_CHARS) return text;
  return text.slice(0, MAX_SUMMARY_CHARS) + TRUNCATION_MARKER;
}

/**
 * Instructions + the student's note. Everything the model sees goes through here.
 */
export function buildSummaryInput(
  title: string,
  text: string,
  length: SummaryLength,
): string {
  return [
    summaryInstructionsFor(length),
    "",
    "--- STUDY MATERIAL ---",
    `Note title: ${title}`,
    truncateForSummary(text),
    "--- END STUDY MATERIAL ---",
  ].join("\n");
}

type SummaryStaleNote = {
  updatedAt: Date;
  summaryUpdatedAt: Date | null;
};

/**
 * A cached summary is stale when there is none, or when the note changed after
 * the summary was generated. Re-extraction / note edits bump `updatedAt` via
 * the existing pipelines, so old summaries are auto-marked stale.
 */
export function isSummaryStale(note: SummaryStaleNote): boolean {
  if (!note.summaryUpdatedAt) return true;
  return note.updatedAt > note.summaryUpdatedAt;
}

type SummaryTextNote = {
  content: string | null;
  extractedText: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
};

function isWrittenNoteRecord(note: SummaryTextNote): boolean {
  return !note.fileUrl && !note.fileName && !note.fileType;
}

/**
 * Resolve the text the model should summarize. File notes use `extractedText`,
 * written notes (no file fields) use `content`. Returns `null` when there is
 * nothing usable — callers turn that into a 409 before any model call.
 */
export function resolveSummaryText(note: SummaryTextNote): string | null {
  const raw = isWrittenNoteRecord(note) ? note.content : note.extractedText;
  if (!raw || raw.trim() === "") return null;
  return raw;
}

/** Parse and validate the requested summary length. Defaults to "detailed". */
export function parseSummaryLength(value: unknown): SummaryLength | null {
  if (value === undefined) return "detailed";
  if (value === "short" || value === "detailed") return value;
  return null;
}
