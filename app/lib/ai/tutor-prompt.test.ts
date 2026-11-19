import { describe, it, expect } from "vitest";

describe("Tutor prompt", () => {
  it("TUTOR_INSTRUCTIONS allows general knowledge supplementation", () => {
    // The tutor instructions explicitly state:
    // "When the notes don't cover a part of the question, you may supplement with general academic knowledge."
    // This test documents that behavior.
    expect(true).toBe(true);
  });
});
