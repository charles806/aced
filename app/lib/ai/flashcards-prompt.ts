/**
 * Prompt + validation layer for AI-generated flashcards.
 *
 * Mirrors the Summary pattern (`app/lib/ai/summary-prompt.ts`): instructions +
 * the student's note material as trusted context, with all parsing/validation
 * in pure functions so routes never trust model output as structured data.
 */

export type FlashcardDifficulty = "easy" | "medium" | "hard" | "mixed";

export type FlashcardInput = { front: string; back: string };

export const MAX_FLASHCARD_CHARS = 12000;
export const MIN_CARD_COUNT = 3;
export const MAX_CARD_COUNT = 30;
export const DEFAULT_CARD_COUNT = 12;
export const MAX_FRONT_CHARS = 500;
export const MAX_BACK_CHARS = 2000;

const TRUNCATION_MARKER = "\n[truncated...]";

export const FLASHCARD_DIFFICULTIES: readonly FlashcardDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "mixed",
];

function difficultyGuidance(difficulty: FlashcardDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "Keep questions simple recall (definitions, key facts, names).";
    case "medium":
      return "Mix simple recall with short explanations of how/why.";
    case "hard":
      return "Emphasize application, reasoning, and connections between ideas — not just recall.";
    case "mixed":
      return "Mix easy recall, medium explanation, and a few hard application questions.";
  }
}

export const FLASHCARD_INSTRUCTIONS = `You are ACED's flashcard generator. Create study flashcards from the student's own study material below.

Rules:
- Base every card only on the material below. Never add facts from outside it.
- Each card needs a clear "front" (question or prompt) and a "back" (answer or explanation).
- Keep fronts to one question each, under 25 words. Keep backs accurate and under 60 words.
- Cover the most important ideas across the whole material. Do not repeat near-duplicate questions.
- If parts of the material look like OCR noise or are unreadable, skip them instead of guessing.
- Reply with JSON only — no preamble, no markdown fences, no commentary.`;

export function truncateForFlashcards(text: string): string {
  if (text.length <= MAX_FLASHCARD_CHARS) return text;
  return text.slice(0, MAX_FLASHCARD_CHARS) + TRUNCATION_MARKER;
}

/**
 * Instructions + the student's note. Everything the model sees goes through here.
 */
export function buildFlashcardsInput(
  title: string,
  text: string,
  count: number,
  difficulty: FlashcardDifficulty,
): string {
  return [
    FLASHCARD_INSTRUCTIONS,
    "",
    `Make exactly ${count} flashcards. Difficulty: ${difficulty}. ${difficultyGuidance(difficulty)}`,
    'Respond with a JSON object shaped like {"cards":[{"front":"...","back":"..."}]}.',
    "",
    "--- STUDY MATERIAL ---",
    `Note title: ${title}`,
    truncateForFlashcards(text),
    "--- END STUDY MATERIAL ---",
  ].join("\n");
}

type FlashcardSourceNote = {
  content: string | null;
  extractedText: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
};

function isWrittenNoteRecord(note: FlashcardSourceNote): boolean {
  return !note.fileUrl && !note.fileName && !note.fileType;
}

/**
 * Resolve the text the model should use. File notes use `extractedText`,
 * written notes (no file fields) use `content`. Returns `null` when there is
 * nothing usable — callers turn that into a 409/422 before any model call.
 * Same readiness rule as summaries and the tutor.
 */
export function resolveFlashcardSourceText(
  note: FlashcardSourceNote,
): string | null {
  const raw = isWrittenNoteRecord(note) ? note.content : note.extractedText;
  if (!raw || raw.trim() === "") return null;
  return raw;
}

/** Parse and validate the requested card count. Defaults to 12. */
export function parseCardCount(value: unknown): number | null {
  if (value === undefined || value === null) return DEFAULT_CARD_COUNT;
  const count =
    typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : typeof value === "number"
        ? value
        : NaN;
  if (!Number.isInteger(count)) return null;
  if (count < MIN_CARD_COUNT || count > MAX_CARD_COUNT) return null;
  return count;
}

/** Parse and validate the requested difficulty. Defaults to "mixed". */
export function parseDifficulty(value: unknown): FlashcardDifficulty | null {
  if (value === undefined || value === null) return "mixed";
  if (
    value === "easy" ||
    value === "medium" ||
    value === "hard" ||
    value === "mixed"
  ) {
    return value;
  }
  return null;
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeCard(value: unknown): FlashcardInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const front = record.front;
  const back = record.back;
  if (typeof front !== "string" || typeof back !== "string") return null;
  const cleanFront = front.trim();
  const cleanBack = back.trim();
  if (cleanFront === "" || cleanBack === "") return null;
  if (cleanFront.length > MAX_FRONT_CHARS || cleanBack.length > MAX_BACK_CHARS) {
    return null;
  }
  return { front: cleanFront, back: cleanBack };
}

/**
 * Validate and normalize model output into cards. Never throws — returns
 * `null` for malformed, empty, or incomplete output so callers can safely
 * reject it with a 502 instead of persisting garbage.
 *
 * Accepts either `{"cards":[...]}` or a bare `[...]` array. Dedupes
 * case-insensitive identical fronts and caps the result at `maxCards`.
 */
export function parseFlashcardsOutput(
  raw: string,
  maxCards: number,
): FlashcardInput[] | null {
  if (!raw || raw.trim() === "") return null;
  const limit =
    Number.isInteger(maxCards) && maxCards > 0
      ? Math.min(maxCards, MAX_CARD_COUNT)
      : DEFAULT_CARD_COUNT;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    return null;
  }

  const candidates: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).cards as unknown[]
      : [];

  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const seen = new Set<string>();
  const cards: FlashcardInput[] = [];
  for (const candidate of candidates) {
    const card = normalizeCard(candidate);
    if (!card) continue;
    const key = card.front.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(card);
    if (cards.length >= limit) break;
  }

  if (cards.length === 0) return null;
  return cards;
}

/** Validate a deck title. Trimmed, non-empty, max 100 chars (matches subjects/notes). */
export function validateDeckTitle(
  value: unknown,
): { title: string } | { error: string } {
  if (typeof value !== "string" || value.trim() === "") {
    return { error: "Deck title is required" };
  }
  const title = value.trim();
  if (title.length > 100) {
    return { error: "Deck title must be 100 characters or fewer" };
  }
  return { title };
}

/** Validate a card front/back pair. */
export function validateCardFields(
  front: unknown,
  back: unknown,
): { front: string; back: string } | { error: string } {
  if (typeof front !== "string" || front.trim() === "") {
    return { error: "Question is required" };
  }
  if (typeof back !== "string" || back.trim() === "") {
    return { error: "Answer is required" };
  }
  const cleanFront = front.trim();
  const cleanBack = back.trim();
  if (cleanFront.length > MAX_FRONT_CHARS) {
    return {
      error: `Question must be ${MAX_FRONT_CHARS} characters or fewer`,
    };
  }
  if (cleanBack.length > MAX_BACK_CHARS) {
    return { error: `Answer must be ${MAX_BACK_CHARS} characters or fewer` };
  }
  return { front: cleanFront, back: cleanBack };
}

/** Validate an idempotency key when the client sends one (must be a short string). */
export function validateIdempotencyKey(
  value: unknown,
): { key: string } | { error: string } | { key: null } {
  if (value === undefined || value === null) return { key: null };
  if (typeof value !== "string" || value.trim() === "") {
    return { error: "Idempotency key must be a non-empty string" };
  }
  const key = value.trim();
  if (key.length > 100) {
    return { error: "Idempotency key must be 100 characters or fewer" };
  }
  return { key };
}
