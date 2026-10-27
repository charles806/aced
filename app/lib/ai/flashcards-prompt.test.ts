import { describe, expect, it } from "vitest";
import {
  buildFlashcardsInput,
  DEFAULT_CARD_COUNT,
  FLASHCARD_INSTRUCTIONS,
  MAX_BACK_CHARS,
  MAX_FLASHCARD_CHARS,
  MAX_FRONT_CHARS,
  parseCardCount,
  parseDifficulty,
  parseFlashcardsOutput,
  resolveFlashcardSourceText,
  truncateForFlashcards,
  validateCardFields,
  validateDeckTitle,
  validateIdempotencyKey,
} from "./flashcards-prompt";

describe("flashcards-prompt", () => {
  it("includes title, material, count, and difficulty in the model input", () => {
    const input = buildFlashcardsInput(
      "Photosynthesis",
      "Chlorophyll rocks.",
      10,
      "medium",
    );

    expect(input).toContain("Note title: Photosynthesis");
    expect(input).toContain("Chlorophyll rocks.");
    expect(input).toContain("exactly 10 flashcards");
    expect(input).toContain("medium");
    expect(input).toContain(FLASHCARD_INSTRUCTIONS);
    expect(input).toContain('"cards"');
  });

  it("truncates overlong text with a marker at 12k chars", () => {
    const long = "a".repeat(MAX_FLASHCARD_CHARS + 100);
    const truncated = truncateForFlashcards(long);

    expect(truncated).toContain("[truncated...]");
    expect(truncated.length).toBeLessThan(long.length);
    expect(truncateForFlashcards("hello")).toBe("hello");
  });

  it("resolves file notes from extractedText and written notes from content", () => {
    expect(
      resolveFlashcardSourceText({
        content: null,
        extractedText: "  extracted body  ",
        fileUrl: "key",
        fileName: "note.pdf",
        fileType: "application/pdf",
      }),
    ).toBe("  extracted body  ");

    expect(
      resolveFlashcardSourceText({
        content: "written body",
        extractedText: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
      }),
    ).toBe("written body");
  });

  it("returns null when no usable source text exists", () => {
    expect(
      resolveFlashcardSourceText({
        content: "   ",
        extractedText: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
      }),
    ).toBeNull();

    expect(
      resolveFlashcardSourceText({
        content: null,
        extractedText: "  ",
        fileUrl: "key",
        fileName: "n.pdf",
        fileType: "application/pdf",
      }),
    ).toBeNull();
  });

  it("parses card counts, defaulting to 12 within 3-30", () => {
    expect(parseCardCount(undefined)).toBe(DEFAULT_CARD_COUNT);
    expect(parseCardCount(10)).toBe(10);
    expect(parseCardCount("8")).toBe(8);
    expect(parseCardCount(2)).toBeNull();
    expect(parseCardCount(31)).toBeNull();
    expect(parseCardCount(7.5)).toBeNull();
    expect(parseCardCount("many")).toBeNull();
  });

  it("parses difficulty, defaulting to mixed", () => {
    expect(parseDifficulty(undefined)).toBe("mixed");
    expect(parseDifficulty("easy")).toBe("easy");
    expect(parseDifficulty("hard")).toBe("hard");
    expect(parseDifficulty("mixed")).toBe("mixed");
    expect(parseDifficulty("extreme")).toBeNull();
    expect(parseDifficulty(42)).toBeNull();
  });

  it("parses a valid object-shaped model response", () => {
    const raw = JSON.stringify({
      cards: [
        { front: "What is X?", back: "X is Y." },
        { front: "Define Z.", back: "Z means W." },
      ],
    });

    expect(parseFlashcardsOutput(raw, 10)).toEqual([
      { front: "What is X?", back: "X is Y." },
      { front: "Define Z.", back: "Z means W." },
    ]);
  });

  it("parses a bare-array response and strips code fences", () => {
    const raw =
      '```json\n[{"front":"Q1","back":"A1"},{"front":"Q2","back":"A2"}]\n```';

    expect(parseFlashcardsOutput(raw, 10)).toEqual([
      { front: "Q1", back: "A1" },
      { front: "Q2", back: "A2" },
    ]);
  });

  it("dedupes repeated fronts and caps at the requested count", () => {
    const raw = JSON.stringify({
      cards: [
        { front: "Same?", back: "First" },
        { front: "same?", back: "Second" },
        { front: "Other?", back: "Third" },
      ],
    });

    expect(parseFlashcardsOutput(raw, 2)).toEqual([
      { front: "Same?", back: "First" },
      { front: "Other?", back: "Third" },
    ]);
  });

  it("rejects malformed, empty, or incomplete model output safely", () => {
    expect(parseFlashcardsOutput("", 10)).toBeNull();
    expect(parseFlashcardsOutput("not json at all", 10)).toBeNull();
    expect(parseFlashcardsOutput(JSON.stringify({}), 10)).toBeNull();
    expect(parseFlashcardsOutput(JSON.stringify({ cards: [] }), 10)).toBeNull();
    expect(
      parseFlashcardsOutput(
        JSON.stringify({ cards: [{ front: "  ", back: "A" }] }),
        10,
      ),
    ).toBeNull();
    expect(
      parseFlashcardsOutput(
        JSON.stringify({ cards: [{ front: "Q" }] }),
        10,
      ),
    ).toBeNull();
    expect(
      parseFlashcardsOutput(
        JSON.stringify({
          cards: [{ front: "Q", back: "A", extra: 42 }],
        }),
        10,
      ),
    ).toEqual([{ front: "Q", back: "A" }]);
  });

  it("rejects overlong fronts and backs", () => {
    expect(
      parseFlashcardsOutput(
        JSON.stringify({
          cards: [{ front: "x".repeat(MAX_FRONT_CHARS + 1), back: "A" }],
        }),
        10,
      ),
    ).toBeNull();
    expect(
      parseFlashcardsOutput(
        JSON.stringify({
          cards: [{ front: "Q", back: "x".repeat(MAX_BACK_CHARS + 1) }],
        }),
        10,
      ),
    ).toBeNull();
  });

  it("validates deck titles and card fields", () => {
    expect(validateDeckTitle("  Biology  ")).toEqual({ title: "Biology" });
    expect(validateDeckTitle("")).toEqual({
      error: "Deck title is required",
    });
    expect(validateDeckTitle("x".repeat(101))).toEqual({
      error: "Deck title must be 100 characters or fewer",
    });

    expect(validateCardFields("Q?", "A.")).toEqual({ front: "Q?", back: "A." });
    expect(validateCardFields("", "A")).toEqual({
      error: "Question is required",
    });
    expect(validateCardFields("Q", "")).toEqual({
      error: "Answer is required",
    });
  });

  it("validates idempotency keys", () => {
    expect(validateIdempotencyKey(undefined)).toEqual({ key: null });
    expect(validateIdempotencyKey("abc-123")).toEqual({ key: "abc-123" });
    expect(validateIdempotencyKey("")).toEqual({
      error: "Idempotency key must be a non-empty string",
    });
  });
});
