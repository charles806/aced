import OpenAI from "openai";

export const client = new OpenAI({
  apiKey: process.env.BREWKEG_API_KEY,
  baseURL: process.env.BREWKEG_BASE_URL,
});

const DEFAULT_MODEL = process.env.DEFAULT_MODEL;

/**
 * The only place ACED talks to the model provider (BrewKeg, OpenAI-compatible).
 * Callers pass plain text in and get the model's text out. No knowledge of
 * Prisma, notes, or users lives here.
 *
 * Provider errors are intentionally allowed to throw so callers decide how to
 * surface them (the Tutor route turns them into a generic 502).
 */
export async function generateText(input: string): Promise<string> {
  const response = await client.responses.create({
    model: DEFAULT_MODEL,
    input,
  });

  return response.output_text;
}

export type StreamTextOptions = {
  /**
   * Called for every text fragment the model produces, in order, as soon as it
   * arrives. Used by the Tutor route to push text to the browser immediately.
   */
  onDelta: (delta: string) => void | Promise<void>;
  /** Lets a disconnecting client cancel the provider request. */
  signal?: AbortSignal;
};

/**
 * Streaming sibling of `generateText()`. Same client, same base URL, same model
 * — only `stream: true` differs.
 *
 * `onDelta` receives each text fragment as it arrives. The complete answer is
 * accumulated here (inside the AI layer, where the stream lives) and returned
 * once the provider stream finishes, so callers can persist one finished reply
 * instead of guessing when partial text stopped arriving.
 *
 * Errors are allowed to throw — including provider-level `error` / `failed` /
 * `incomplete` events, which are converted into thrown `Error`s here so no
 * caller has to know the provider's event names. A response that completes with
 * no text also throws, because an empty answer is never worth persisting.
 */
export async function streamText(
  input: string,
  { onDelta, signal }: StreamTextOptions,
): Promise<string> {
  const stream = await client.responses.create(
    {
      model: DEFAULT_MODEL,
      input,
      stream: true,
    },
    { signal },
  );

  let full = "";

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      if (event.delta) {
        full += event.delta;
        await onDelta(event.delta);
      }
      continue;
    }

    if ((event as any).type === "error" || (event as any).type === "response.error") {
      throw new Error("Model stream error");
    }

    if (event.type === "response.failed") {
      const reason =
        (event as any).response?.error?.message ??
        (event as any).error?.message ??
        "unknown";
      throw new Error(`Model stream failed: ${reason}`);
    }

    if (event.type === "response.incomplete") {
      const reason = (event as any).response?.incomplete_details?.reason ?? "unknown";
      throw new Error(`Model stream incomplete: ${reason}`);
    }
  }

  if (full.trim() === "") {
    throw new Error("Model stream produced no text");
  }

  return full;
}