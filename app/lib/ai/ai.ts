import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

/**
 * Create the provider client on first use, not at module load.
 *
 * Building the client eagerly meant a missing BREWKEG_API_KEY threw during
 * `next build` (route modules are imported to collect metadata), failing the
 * whole deploy instead of just the requests that actually need the model.
 */
export function getClient(): OpenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.BREWKEG_API_KEY;

  if (!apiKey) {
    throw new Error(
      "BREWKEG_API_KEY is not set. Add it to the environment to use AI features.",
    );
  }

  cachedClient = new OpenAI({
    apiKey,
    baseURL: process.env.BREWKEG_BASE_URL,
  });

  return cachedClient;
}

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
  const response = await getClient().responses.create({
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
  const stream = await getClient().responses.create(
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

    if (
      (event as unknown as Record<string, unknown>).type === "error" ||
      (event as unknown as Record<string, unknown>).type === "response.error"
    ) {
      throw new Error("Model stream error");
    }

    if (event.type === "response.failed") {
      const reason =
        ((event as unknown as Record<string, unknown>).response as Record<string, unknown> | undefined)
          ?.error ??
        ((event as unknown as Record<string, unknown>).error as Record<string, unknown> | undefined)
          ?.message ??
        "unknown";
      const msg = typeof reason === "string" ? reason : typeof (reason as Record<string, unknown>)?.message === "string" ? ((reason as Record<string, unknown>).message as string) : "unknown";
      throw new Error(`Model stream failed: ${msg}`);
    }

    if (event.type === "response.incomplete") {
      const reason =
        ((event as unknown as Record<string, unknown>).response as Record<string, unknown> | undefined)
          ?.incomplete_details ??
        "unknown";
      const r = typeof reason === "object" && reason !== null && "reason" in reason ? (reason as Record<string, unknown>).reason : "unknown";
      throw new Error(`Model stream incomplete: ${String(r)}`);
    }
  }

  if (full.trim() === "") {
    throw new Error("Model stream produced no text");
  }

  return full;
}


