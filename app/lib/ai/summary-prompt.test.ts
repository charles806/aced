import { describe, expect, it } from "vitest";
import {
  buildSummaryInput,
  isSummaryStale,
  MAX_SUMMARY_CHARS,
  parseSummaryLength,
  resolveSummaryText,
  SUMMARY_INSTRUCTIONS_DETAILED,
  SUMMARY_INSTRUCTIONS_SHORT,
  truncateForSummary,
} from "./summary-prompt";

describe("summary-prompt", () => {
  it("includes the title and note text in the model input", () => {
    const input = buildSummaryInput("Photosynthesis", "Chlorophyll rocks.", "detailed");

    expect(input).toContain("Note title: Photosynthesis");
    expect(input).toContain("Chlorophyll rocks.");
    expect(input).toContain(SUMMARY_INSTRUCTIONS_DETAILED);
  });

  it("uses different instructions for short vs detailed", () => {
    const short = buildSummaryInput("T", "Some text here.", "short");
    const detailed = buildSummaryInput("T", "Some text here.", "detailed");

    expect(short).toContain(SUMMARY_INSTRUCTIONS_SHORT);
    expect(short).not.toContain(SUMMARY_INSTRUCTIONS_DETAILED);
    expect(detailed).toContain(SUMMARY_INSTRUCTIONS_DETAILED);
    expect(detailed).not.toContain(SUMMARY_INSTRUCTIONS_SHORT);
  });

  it("truncates overlong text with a marker at 12k chars", () => {
    const long = "a".repeat(MAX_SUMMARY_CHARS + 100);
    const truncated = truncateForSummary(long);

    expect(truncated).toContain("[truncated...]");
    expect(truncated.length).toBeLessThan(long.length);

    const input = buildSummaryInput("T", long, "short");
    expect(input).toContain("[truncated...]");
  });

  it("leaves short text untouched", () => {
    expect(truncateForSummary("hello")).toBe("hello");
  });

  it("marks summaries stale when the note changed after generation", () => {
    expect(
      isSummaryStale({
        updatedAt: new Date("2026-10-12T10:00:00Z"),
        summaryUpdatedAt: new Date("2026-10-12T09:00:00Z"),
      }),
    ).toBe(true);

    expect(
      isSummaryStale({
        updatedAt: new Date("2026-10-12T09:00:00Z"),
        summaryUpdatedAt: new Date("2026-10-12T10:00:00Z"),
      }),
    ).toBe(false);
  });

  it("marks missing summaries stale", () => {
    expect(
      isSummaryStale({
        updatedAt: new Date(),
        summaryUpdatedAt: null,
      }),
    ).toBe(true);
  });

  it("resolves file notes from extractedText", () => {
    expect(
      resolveSummaryText({
        content: null,
        extractedText: "  extracted body  ",
        fileUrl: "key",
        fileName: "note.pdf",
        fileType: "application/pdf",
      }),
    ).toBe("  extracted body  ");
  });

  it("resolves written notes from content", () => {
    expect(
      resolveSummaryText({
        content: "written body",
        extractedText: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
      }),
    ).toBe("written body");
  });

  it("rejects empty or whitespace input pre-model", () => {
    expect(
      resolveSummaryText({
        content: "   ",
        extractedText: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
      }),
    ).toBeNull();

    expect(
      resolveSummaryText({
        content: null,
        extractedText: "  ",
        fileUrl: "key",
        fileName: "n.pdf",
        fileType: "application/pdf",
      }),
    ).toBeNull();

    expect(
      resolveSummaryText({
        content: null,
        extractedText: null,
        fileUrl: "key",
        fileName: "n.pdf",
        fileType: "application/pdf",
      }),
    ).toBeNull();
  });

  it("parses summary length, defaulting to detailed", () => {
    expect(parseSummaryLength(undefined)).toBe("detailed");
    expect(parseSummaryLength("short")).toBe("short");
    expect(parseSummaryLength("detailed")).toBe("detailed");
    expect(parseSummaryLength("long")).toBeNull();
    expect(parseSummaryLength(42)).toBeNull();
  });
});
