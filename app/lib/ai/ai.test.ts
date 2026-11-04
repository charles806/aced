import { describe, it, expect, beforeEach, vi } from "vitest";

describe("AI provider abstraction", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.AI_PRIMARY_PROVIDER = "nim";
    process.env.AI_FALLBACK_PROVIDER = "brewkeg";
    process.env.NIM_API_KEY = "nim-key";
    process.env.NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
    process.env.BREWKEG_API_KEY = "brew-key";
    process.env.BREWKEG_BASE_URL = "https://brewkeg.dev/v1";
    process.env.DEFAULT_MODEL = "gpt-5-mini";
    process.env.NIM_TUTOR_MODEL = "nvidia/tutor";
    process.env.NIM_SUMMARY_MODEL = "nvidia/summary";
    process.env.NIM_FLASHCARDS_MODEL = "nvidia/flashcards";
    process.env.NIM_QUIZ_MODEL = "nvidia/quiz";
  });

  it("exports generateText and streamText", async () => {
    const ai = await import("./ai");
    expect(typeof ai.generateText).toBe("function");
    expect(typeof ai.streamText).toBe("function");
  });

  it("requires NIM_API_KEY", async () => {
    delete process.env.NIM_API_KEY;
    const ai = await import("./ai");
    await expect(ai.generateText("hi", { feature: "tutor" })).rejects.toThrow(/NIM_API_KEY is not set/);
  });
});
