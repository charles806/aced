import { describe, expect, it } from "vitest";
import {
  buildQuizInput,
  DEFAULT_QUESTION_COUNT,
  MAX_EXPLANATION_CHARS,
  MAX_OPTION_CHARS,
  MAX_PROMPT_CHARS,
  MAX_QUIZ_CHARS,
  MIN_QUESTION_COUNT,
  parseDifficulty,
  parseQuestionCount,
  parseQuizOutput,
  QUIZ_INSTRUCTIONS,
  resolveQuizSourceText,
  truncateForQuiz,
  validateIdempotencyKey,
  validateQuestionFields,
  validateQuizTitle,
} from "./quiz-prompt";

describe("quiz-prompt", () => {
  it("includes title, material, count, and difficulty in the model input", () => {
    const input = buildQuizInput("Photosynthesis", "Chlorophyll rocks.", 10, "medium");

    expect(input).toContain("Note title: Photosynthesis");
    expect(input).toContain("Chlorophyll rocks.");
    expect(input).toContain("exactly 10 questions");
    expect(input).toContain("medium");
    expect(input).toContain(QUIZ_INSTRUCTIONS);
    expect(input).toContain("questions");
  });

  it("truncates overlong text with a marker at 12k chars", () => {
    const long = "a".repeat(MAX_QUIZ_CHARS + 100);
    const truncated = truncateForQuiz(long);

    expect(truncated).toContain("[truncated...]");
    expect(truncated.length).toBeLessThan(long.length);
    expect(truncateForQuiz("hello")).toBe("hello");
  });

  it("resolves file notes from extractedText and written notes from content", () => {
    expect(
      resolveQuizSourceText({
        content: null,
        extractedText: "  extracted body  ",
        fileUrl: "key",
        fileName: "note.pdf",
        fileType: "application/pdf",
      }),
    ).toBe("  extracted body  ");

    expect(
      resolveQuizSourceText({
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
      resolveQuizSourceText({
        content: "   ",
        extractedText: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
      }),
    ).toBeNull();

    expect(
      resolveQuizSourceText({
        content: null,
        extractedText: "  ",
        fileUrl: "key",
        fileName: "n.pdf",
        fileType: "application/pdf",
      }),
    ).toBeNull();
  });

  it("parses question counts, defaulting to 10 within 3-30", () => {
    expect(parseQuestionCount(undefined)).toBe(DEFAULT_QUESTION_COUNT);
    expect(parseQuestionCount(10)).toBe(10);
    expect(parseQuestionCount("8")).toBe(8);
    expect(parseQuestionCount(2)).toBeNull();
    expect(parseQuestionCount(31)).toBeNull();
    expect(parseQuestionCount(7.5)).toBeNull();
    expect(parseQuestionCount("many")).toBeNull();
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
      questions: [
        {
          prompt: "What is X?",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          explanation: "X is Y because...",
        },
        {
          prompt: "Define Z.",
          options: ["W", "X", "Y", "Z"],
          correctIndex: 2,
          explanation: "Z means W...",
        },
      ],
    });

    expect(parseQuizOutput(raw, 10)).toEqual([
      {
        prompt: "What is X?",
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "X is Y because...",
      },
      {
        prompt: "Define Z.",
        options: ["W", "X", "Y", "Z"],
        correctIndex: 2,
        explanation: "Z means W...",
      },
    ]);
  });

  it("parses a bare-array response and strips code fences", () => {
    const raw =
      '```json\n[{"prompt":"Q1","options":["A","B","C","D"],"correctIndex":0},{"prompt":"Q2","options":["A","B","C","D"],"correctIndex":1}]\n```';

    expect(parseQuizOutput(raw, 10)).toEqual([
      { prompt: "Q1", options: ["A", "B", "C", "D"], correctIndex: 0 },
      { prompt: "Q2", options: ["A", "B", "C", "D"], correctIndex: 1 },
    ]);
  });

  it("dedupes repeated prompts and caps at the requested count", () => {
    const raw = JSON.stringify({
      questions: [
        { prompt: "Same?", options: ["A", "B", "C", "D"], correctIndex: 0 },
        { prompt: "same?", options: ["A", "B", "C", "D"], correctIndex: 1 },
        { prompt: "Other?", options: ["A", "B", "C", "D"], correctIndex: 2 },
      ],
    });

    expect(parseQuizOutput(raw, 2)).toEqual([
      { prompt: "Same?", options: ["A", "B", "C", "D"], correctIndex: 0 },
      { prompt: "Other?", options: ["A", "B", "C", "D"], correctIndex: 2 },
    ]);
  });

  it("rejects malformed, empty, or incomplete model output safely", () => {
    expect(parseQuizOutput("", 10)).toBeNull();
    expect(parseQuizOutput("not json at all", 10)).toBeNull();
    expect(parseQuizOutput(JSON.stringify({}), 10)).toBeNull();
    expect(parseQuizOutput(JSON.stringify({ questions: [] }), 10)).toBeNull();
    expect(
      parseQuizOutput(
        JSON.stringify({ questions: [{ prompt: "  ", options: ["A", "B", "C", "D"], correctIndex: 0 }] }),
        10,
      ),
    ).toBeNull();
    expect(
      parseQuizOutput(
        JSON.stringify({ questions: [{ prompt: "Q", options: ["A", "B", "C"], correctIndex: 0 }] }),
        10,
      ),
    ).toBeNull();
    expect(
      parseQuizOutput(
        JSON.stringify({ questions: [{ prompt: "Q", options: ["A", "B", "C", "D"], correctIndex: 4 }] }),
        10,
      ),
    ).toBeNull();
    expect(
      parseQuizOutput(
        JSON.stringify({
          questions: [{ prompt: "Q", options: ["A", "B", "C", "D"], correctIndex: 0, extra: 42 }],
        }),
        10,
      ),
    ).toEqual([{ prompt: "Q", options: ["A", "B", "C", "D"], correctIndex: 0 }]);
  });

  it("rejects overlong prompts, options, and explanations", () => {
    expect(
      parseQuizOutput(
        JSON.stringify({
          questions: [{ prompt: "x".repeat(MAX_PROMPT_CHARS + 1), options: ["A", "B", "C", "D"], correctIndex: 0 }],
        }),
        10,
      ),
    ).toBeNull();
    expect(
      parseQuizOutput(
        JSON.stringify({
          questions: [{ prompt: "Q", options: ["x".repeat(MAX_OPTION_CHARS + 1), "B", "C", "D"], correctIndex: 0 }],
        }),
        10,
      ),
    ).toBeNull();
    expect(
      parseQuizOutput(
        JSON.stringify({
          questions: [
            { prompt: "Q", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "x".repeat(MAX_EXPLANATION_CHARS + 1) },
          ],
        }),
        10,
      ),
    ).toBeNull();
  });

  it("validates quiz titles", () => {
    expect(validateQuizTitle("  Biology  ")).toEqual({ title: "Biology" });
    expect(validateQuizTitle("")).toEqual({ error: "Quiz title is required" });
    expect(validateQuizTitle("x".repeat(101))).toEqual({
      error: "Quiz title must be 100 characters or fewer",
    });
  });

  it("validates question fields for manual editing", () => {
    expect(
      validateQuestionFields("Q?", ["A", "B", "C", "D"], 0, "Explanation"),
    ).toEqual({ prompt: "Q?", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "Explanation" });
    expect(validateQuestionFields("", ["A", "B", "C", "D"], 0)).toEqual({
      error: "Question prompt is required",
    });
    expect(validateQuestionFields("Q", ["A", "B", "C"], 0)).toEqual({
      error: "Question must have exactly 4 options",
    });
    expect(validateQuestionFields("Q", ["A", "B", "C", "D"], 4)).toEqual({
      error: "Correct answer index must be 0, 1, 2, or 3",
    });
    expect(validateQuestionFields("Q", ["", "B", "C", "D"], 0)).toEqual({
      error: "All 4 options are required",
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