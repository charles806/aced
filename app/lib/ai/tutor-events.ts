/**
 * Wire protocol for the streaming AI Tutor endpoint.
 *
 * `POST /api/ai/tutor` answers a *successful* request with
 * `Content-Type: application/x-ndjson`: one JSON object per line, flushed as
 * soon as it is produced. Anything that fails before the stream opens (auth,
 * Pro check, validation, note ownership, extraction readiness) is still a normal
 * JSON `{ "error": string }` response with an HTTP status code, so the client can
 * handle those before it ever sees a stream.
 *
 * The event sequence for a successful turn is always:
 *
 *   {"type":"meta","conversationId":"clx..."}      <- sent first, always
 *   {"type":"delta","text":"Photosynthesis "}       <- zero or more, in order
 *   {"type":"delta","text":"is how plants ..."}
 *   {"type":"done","conversationId":"clx..."}       <- exactly one terminal event
 *
 * A failed turn emits `meta` (and possibly some `delta` events) and then, in
 * place of `done`:
 *
 *   {"type":"error","error":"The AI tutor is unavailable right now. Please try again."}
 *
 * Notes:
 * - `meta` is what gives the frontend its `conversationId` on the very first
 *   turn, before any text arrives.
 * - `done` means the assistant reply was persisted as a single `AIMessage`.
 *   An `error` event means nothing was persisted, so the client can offer a
 *   retry without a half-written assistant message in the transcript.
 * - `error.error` is always a curated, user-facing string produced by the route.
 *   Provider details are logged server-side and never put on the wire.
 *
 * This module is dependency-free and isomorphic: the route encodes events with
 * it, the browser decodes them with it, and both share these types.
 */

export const TUTOR_STREAM_CONTENT_TYPE = "application/x-ndjson";

export type TutorStreamEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "done"; conversationId: string }
  | { type: "error"; error: string };

/** Line separator used by the NDJSON encoder. */
const LINE_END = "\n";

/** Serialise one event as a single NDJSON line (including the newline). */
export function encodeTutorEvent(event: TutorStreamEvent): string {
  return `${JSON.stringify(event)}${LINE_END}`;
}

/**
 * Parse one NDJSON line. Returns `null` for blank lines and for anything that
 * isn't a recognisable event, so a malformed line can never crash the UI.
 */
export function parseTutorEvent(line: string): TutorStreamEvent | null {
  const trimmed = line.trim();

  if (trimmed === "") return null;

  let value: unknown;

  try {
    value = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const event = value as Record<string, unknown>;

  switch (event.type) {
    case "meta":
    case "done":
      return typeof event.conversationId === "string"
        ? { type: event.type, conversationId: event.conversationId }
        : null;
    case "delta":
      return typeof event.text === "string"
        ? { type: "delta", text: event.text }
        : null;
    case "error":
      return typeof event.error === "string"
        ? { type: "error", error: event.error }
        : null;
    default:
      return null;
  }
}

/**
 * Read a streaming Tutor response and hand each event to `onEvent` in order.
 *
 * Chunk boundaries are arbitrary, so a chunk may hold half a line or several
 * lines; the trailing partial line is buffered until its newline arrives.
 * Stops at the first terminal event (`done` / `error`).
 */
export async function readTutorStream(
  response: Response,
  onEvent: (event: TutorStreamEvent) => void,
): Promise<void> {
  const body = response.body;

  if (!body) {
    throw new Error("Tutor response had no body");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf(LINE_END);

      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + LINE_END.length);

        const event = parseTutorEvent(line);

        if (event) {
          onEvent(event);

          if (event.type === "done" || event.type === "error") {
            await reader.cancel().catch(() => {});
            return;
          }
        }

        newlineIndex = buffer.indexOf(LINE_END);
      }
    }

    // The server always terminates events with a newline, but a truncated
    // stream can still leave one final line buffered. Never silently drop it.
    const trailing = parseTutorEvent(buffer);

    if (trailing) onEvent(trailing);
  } finally {
    reader.releaseLock();
  }
}

/**
 * Turn a pre-stream failure (a non-OK JSON response) into a friendly message.
 * Server messages are already curated, so they are shown as-is; unknown shapes
 * fall back to a generic message so a provider error can never leak through.
 */
export function tutorFailureMessage(
  status: number,
  payload: unknown,
): string {
  const serverMessage =
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as Record<string, unknown>).error === "string"
      ? (payload as { error: string }).error
      : undefined;

  if (serverMessage) return serverMessage;

  if (status === 401) return "Your session has expired. Please sign in again.";

  if (status === 403) return "ACED Pro is required to use the AI Tutor.";

  if (status === 404) return "We couldn't find that note or conversation.";

  if (status === 409) {
    return "This note isn't ready for AI yet. Try again once extraction finishes.";
  }

  return "Something went wrong on our end. Please try again.";
}