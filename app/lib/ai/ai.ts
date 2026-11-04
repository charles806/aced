import OpenAI from "openai";

type Provider = "nim" | "brewkeg";
type Feature = "tutor" | "summary" | "flashcards" | "quiz" | "default";

interface GenerateOptions {
  feature?: Feature;
  signal?: AbortSignal;
}

interface StreamOptions {
  onDelta: (delta: string) => void | Promise<void>;
  signal?: AbortSignal;
  feature?: Feature;
}

const PROVIDER_CONFIG: Record<Provider, { apiKeyEnv: string; baseUrlEnv: string }> = {
  nim: { apiKeyEnv: "NIM_API_KEY", baseUrlEnv: "NIM_BASE_URL" },
  brewkeg: { apiKeyEnv: "BREWKEG_API_KEY", baseUrlEnv: "BREWKEG_BASE_URL" },
};

const MODEL_ENV: Record<Provider, Record<Feature, string>> = {
  nim: {
    tutor: process.env.NIM_TUTOR_MODEL!,
    summary: process.env.NIM_SUMMARY_MODEL!,
    flashcards: process.env.NIM_FLASHCARDS_MODEL!,
    quiz: process.env.NIM_QUIZ_MODEL!,
    default: process.env.NIM_TUTOR_MODEL!,
  },
  brewkeg: {
    tutor: process.env.DEFAULT_MODEL!,
    summary: process.env.DEFAULT_MODEL!,
    flashcards: process.env.DEFAULT_MODEL!,
    quiz: process.env.DEFAULT_MODEL!,
    default: process.env.DEFAULT_MODEL!,
  },
};

const clients = new Map<Provider, OpenAI>();

function getProviderConfig(provider: Provider) {
  const cfg = PROVIDER_CONFIG[provider];
  const apiKey = process.env[cfg.apiKeyEnv];
  const baseURL = process.env[cfg.baseUrlEnv];
  if (!apiKey) {
    throw new Error(`${cfg.apiKeyEnv} is not set for provider ${provider}`);
  }
  return { apiKey, baseURL };
}

function getClientForProvider(provider: Provider): OpenAI {
  if (clients.has(provider)) return clients.get(provider)!;
  const { apiKey, baseURL } = getProviderConfig(provider);
  const client = new OpenAI({ apiKey, baseURL });
  clients.set(provider, client);
  return client;
}

export function getClient(): OpenAI {
  return getClientForProvider("brewkeg");
}

function getModel(provider: Provider, feature: Feature): string {
  const model = MODEL_ENV[provider][feature];
  if (!model) throw new Error(`Model not configured for ${provider}/${feature}`);
  return model;
}

function isEligibleForFallback(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    const status = err.status;
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
  }
  // Network / timeout errors
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("network") || msg.includes("timeout") || msg.includes("econnreset") || msg.includes("abort")) {
      // Abort should not fallback; caller checks abort
      if (msg.includes("abort")) return false;
      return true;
    }
  }
  return false;
}

async function generateWithProvider(input: string, provider: Provider, feature: Feature, signal?: AbortSignal): Promise<string> {
  const client = getClientForProvider(provider);
  const model = getModel(provider, feature);
  console.log(`[NVIDIA] generate request provider=${provider} feature=${feature} model=${model} baseURL=${process.env.NIM_BASE_URL}`);
  if (provider === "brewkeg") {
    const response = await client.responses.create(
      { model, input },
      { signal }
    );
    return response.output_text;
  } else {
    const response = await client.chat.completions.create(
      {
        model,
        messages: [{ role: "user", content: input }],
      },
      { signal }
    );
    const text = response.choices?.[0]?.message?.content ?? "";
    return text;
  }
}

export async function generateText(input: string, options?: GenerateOptions): Promise<string> {
  const feature = options?.feature ?? "default";
  const primary: Provider = (process.env.AI_PRIMARY_PROVIDER as Provider) || "nim";
  const fallback: Provider = (process.env.AI_FALLBACK_PROVIDER as Provider) || "brewkeg";

  try {
    return await generateWithProvider(input, primary, feature, options?.signal);
  } catch (err) {
    if (options?.signal?.aborted) throw err;
    if (!isEligibleForFallback(err)) throw err;
    if (primary === fallback) throw err;
    // fallback
    return await generateWithProvider(input, fallback, feature, options?.signal);
  }
}

async function streamWithProvider(
  input: string,
  provider: Provider,
  feature: Feature,
  onDelta: (delta: string) => void | Promise<void>,
  signal?: AbortSignal
): Promise<string> {
  const client = getClientForProvider(provider);
  const model = getModel(provider, feature);
  let full = "";

  if (provider === "brewkeg") {
    const stream = await client.responses.create(
      { model, input, stream: true },
      { signal }
    );
    for await (const event of stream) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
        const reason = ((event as any).response as any)?.error ?? (event as any).error?.message ?? "unknown";
        throw new Error(`Model stream failed: ${reason}`);
      }
      if (event.type === "response.incomplete") {
        throw new Error("Model stream incomplete");
      }
    }
    if (!full.trim()) throw new Error("Model stream produced no text");
    return full;
  } else {
    // Diagnostic logging - model only, no credentials or content
    console.log(`[NVIDIA] stream request provider=${provider} feature=${feature} model=${model} baseURL=${process.env.NIM_BASE_URL}`);
    const stream = await client.chat.completions.create(
      {
        model,
        messages: [{ role: "user", content: input }],
        stream: true,
      },
      { signal }
    );
    for await (const chunk of stream) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        await onDelta(delta);
      }
    }
    if (!full.trim()) throw new Error("Model stream produced no text");
    return full;
  }
}

export async function streamText(input: string, { onDelta, signal, feature = "default" }: StreamOptions): Promise<string> {
  const primary: Provider = (process.env.AI_PRIMARY_PROVIDER as Provider) || "nim";
  const fallback: Provider = (process.env.AI_FALLBACK_PROVIDER as Provider) || "brewkeg";

  let firstTokenSent = false;
  const wrappedOnDelta = async (delta: string) => {
    firstTokenSent = true;
    await onDelta(delta);
  };

  try {
    return await streamWithProvider(input, primary, feature, wrappedOnDelta, signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    if (firstTokenSent) throw err; // do not restart
    if (!isEligibleForFallback(err)) throw err;
    if (primary === fallback) throw err;
    // fallback
    return await streamWithProvider(input, fallback, feature, wrappedOnDelta, signal);
  }
}
