/**
 * Prompt + validation layer for AI-generated quizzes.
 *
 * Mirrors the Flashcards pattern (`app/lib/ai/flashcards-prompt.ts`): instructions +
 * the student's note material as trusted context, with all parsing/validation
 * in pure functions so routes never trust model output as structured data.
 */

export type QuizDifficulty = "easy" | "medium" | "hard" | "mixed";

export type QuizQuestionInput = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export const MAX_QUIZ_CHARS = 12000;
export const MIN_QUESTION_COUNT = 3;
export const MAX_QUESTION_COUNT = 30;
export const DEFAULT_QUESTION_COUNT = 10;
export const MAX_PROMPT_CHARS = 500;
export const MAX_OPTION_CHARS = 300;
export const MAX_EXPLANATION_CHARS = 500;

const TRUNCATION_MARKER = "\n[truncated...]";

export const QUIZ_DIFFICULTIES: readonly QuizDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "mixed",
];

function difficultyGuidance(difficulty: QuizDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "Focus on basic recall: definitions, key facts, names, and simple recognition.";
    case "medium":
      return "Mix recall with comprehension: explain concepts, identify relationships, apply to simple scenarios.";
    case "hard":
      return "Emphasize application, analysis, and synthesis: complex scenarios, multi-step reasoning, evaluating trade-offs.";
    case "mixed":
      return "Balance easy recall, medium comprehension, and a few hard application questions.";
  }
}

export const QUIZ_INSTRUCTIONS = `You are ACED's quiz generator. Create a multiple-choice quiz from the student's own study material below.

Rules:
- Base every question only on the material below. Never add facts from outside it.
- Each question must have exactly 4 options (A, B, C, D). Only one option is correct.
- The correct answer index must be 0-based (0 = A, 1 = B, 2 = C, 3 = D).
- Keep prompts to one question each, under 25 words. Keep options under 15 words each.
- Explanations are optional but encouraged — keep them under 60 words.
- Cover the most important ideas across the whole material. Do not repeat near-duplicate questions.
- If parts of the material look like OCR noise or are unreadable, skip them instead of guessing.
- Reply with JSON only — no preamble, no markdown fences, no commentary.`;

export function truncateForQuiz(text: string): string {
  if (text.length <= MAX_QUIZ_CHARS) return text;
  return text.slice(0, MAX_QUIZ_CHARS) + TRUNCATION_MARKER;
}

/**
 * Instructions + the student's note. Everything the model sees goes through here.
 */
export function buildQuizInput(
  title: string,
  text: string,
  count: number,
  difficulty: QuizDifficulty,
): string {
  return [
    QUIZ_INSTRUCTIONS,
    "",
    `Make exactly ${count} questions. Difficulty: ${difficulty}. ${difficultyGuidance(difficulty)}`,
    'Respond with a JSON object shaped like {"questions":[{"prompt":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}',
    "",
    "--- STUDY MATERIAL ---",
    `Note title: ${title}`,
    truncateForQuiz(text),
    "--- END STUDY MATERIAL ---",
  ].join("\n");
}

type QuizSourceNote = {
  content: string | null;
  extractedText: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
};

function isWrittenNoteRecord(note: QuizSourceNote): boolean {
  return !note.fileUrl && !note.fileName && !note.fileType;
}

/**
 * Resolve the text the model should use. File notes use `extractedText`,
 * written notes (no file fields) use `content`. Returns `null` when there is
 * nothing usable — callers turn that into a 409/422 before any model call.
 * Same readiness rule as summaries and the tutor.
 */
export function resolveQuizSourceText(
  note: QuizSourceNote,
): string | null {
  const raw = isWrittenNoteRecord(note) ? note.content : note.extractedText;
  if (!raw || raw.trim() === "") return null;
  return raw;
}

/** Parse and validate the requested question count. Defaults to 10. */
export function parseQuestionCount(value: unknown): number | null {
  if (value === undefined || value === null) return DEFAULT_QUESTION_COUNT;
  const count =
    typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : typeof value === "number"
        ? value
        : NaN;
  if (!Number.isInteger(count)) return null;
  if (count < MIN_QUESTION_COUNT || count > MAX_QUESTION_COUNT) return null;
  return count;
}

/** Parse and validate the requested difficulty. Defaults to "mixed". */
export function parseDifficulty(value: unknown): QuizDifficulty | null {
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

function normalizeQuestion(value: unknown): QuizQuestionInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const prompt = record.prompt;
  const options = record.options;
  const correctIndex = record.correctIndex;
  const explanation = record.explanation;
  if (typeof prompt !== "string") return null;
  if (!Array.isArray(options) || options.length !== 4) return null;
  if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex)) return null;
  if (correctIndex < 0 || correctIndex > 3) return null;
  const cleanPrompt = prompt.trim();
  const cleanOptions = options.map((o) => (typeof o === "string" ? o.trim() : ""));
  if (cleanPrompt === "") return null;
  if (cleanOptions.some((o) => o === "")) return null;
  if (cleanPrompt.length > MAX_PROMPT_CHARS) return null;
  if (cleanOptions.some((o) => o.length > MAX_OPTION_CHARS)) return null;
  if (
    explanation !== undefined &&
    explanation !== null &&
    typeof explanation === "string"
  ) {
    const cleanExplanation = explanation.trim();
    if (cleanExplanation.length > MAX_EXPLANATION_CHARS) return null;
    return {
      prompt: cleanPrompt,
      options: cleanOptions,
      correctIndex,
      explanation: cleanExplanation,
    };
  }
  return { prompt: cleanPrompt, options: cleanOptions, correctIndex };
}

/**
 * Validate and normalize model output into questions. Never throws — returns
 * `null` for malformed, empty, or incomplete output so callers can safely
 * reject it with a 502 instead of persisting garbage.
 *
 * Accepts either `{"questions":[...]}` or a bare `[...]` array. Dedupes
 * case-insensitive identical prompts and caps the result at `maxQuestions`.
 */
export function parseQuizOutput(
  raw: string,
  maxQuestions: number,
): QuizQuestionInput[] | null {
  if (!raw || raw.trim() === "") return null;
  const limit =
    Number.isInteger(maxQuestions) && maxQuestions > 0
      ? Math.min(maxQuestions, MAX_QUESTION_COUNT)
      : DEFAULT_QUESTION_COUNT;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch {
    return null;
  }

  const candidates: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).questions as unknown[]
      : [];

  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const seen = new Set<string>();
  const questions: QuizQuestionInput[] = [];
  for (const candidate of candidates) {
    const question = normalizeQuestion(candidate);
    if (!question) continue;
    const key = question.prompt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(question);
    if (questions.length >= limit) break;
  }

  if (questions.length === 0) return null;
  return questions;
}

/** Validate a quiz title. Trimmed, non-empty, max 100 chars (matches subjects/notes). */
export function validateQuizTitle(
  value: unknown,
): { title: string } | { error: string } {
  if (typeof value !== "string" || value.trim() === "") {
    return { error: "Quiz title is required" };
  }
  const title = value.trim();
  if (title.length > 100) {
    return { error: "Quiz title must be 100 characters or fewer" };
  }
  return { title };
}

/** Validate a question's fields for manual editing. */
export function validateQuestionFields(
  prompt: unknown,
  options: unknown,
  correctIndex: unknown,
  explanation: unknown,
): QuizQuestionInput | { error: string } {
  if (typeof prompt !== "string" || prompt.trim() === "") {
    return { error: "Question prompt is required" };
  }
  if (!Array.isArray(options) || options.length !== 4) {
    return { error: "Question must have exactly 4 options" };
  }
  if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex)) {
    return { error: "Correct answer index is required" };
  }
  if (correctIndex < 0 || correctIndex > 3) {
    return { error: "Correct answer index must be 0, 1, 2, or 3" };
  }
  const cleanPrompt = prompt.trim();
  const cleanOptions = options.map((o) =>
    typeof o === "string" ? o.trim() : "",
  );
  if (cleanPrompt === "") {
    return { error: "Question prompt is required" };
  }
  if (cleanOptions.some((o) => o === "")) {
    return { error: "All 4 options are required" };
  }
  if (cleanPrompt.length > MAX_PROMPT_CHARS) {
    return { error: `Question prompt must be ${MAX_PROMPT_CHARS} characters or fewer` };
  }
  if (cleanOptions.some((o) => o.length > MAX_OPTION_CHARS)) {
    return { error: `Each option must be ${MAX_OPTION_CHARS} characters or fewer` };
  }
  if (
    explanation !== undefined &&
    explanation !== null &&
    typeof explanation === "string"
  ) {
    const cleanExplanation = explanation.trim();
    if (cleanExplanation.length > MAX_EXPLANATION_CHARS) {
      return { error: `Explanation must be ${MAX_EXPLANATION_CHARS} characters or fewer` };
    }
    return {
      prompt: cleanPrompt,
      options: cleanOptions,
      correctIndex,
      explanation: cleanExplanation,
    };
  }
  return { prompt: cleanPrompt, options: cleanOptions, correctIndex };
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