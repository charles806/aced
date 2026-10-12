import { describe, expect, it } from "vitest";
import {
  encodeTutorEvent,
  parseTutorEvent,
  readTutorStream,
  tutorFailureMessage,
  type TutorStreamEvent,
} from "./tutor-events";

function streamFromEvents(events: TutorStreamEvent[]): ReadableStream<Uint8Array> {
  const chunks = events.map((e) => new TextEncoder().encode(`${JSON.stringify(e)}\n`));
  let i = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(chunks[i++]);
        return;
      }
      controller.close();
    },
  });
}

function streamFromStrings(lines: string[]): ReadableStream<Uint8Array> {
  let i = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < lines.length) {
        controller.enqueue(new TextEncoder().encode(lines[i++]));
        return;
      }
      controller.close();
    },
  });
}

describe("tutor-events", () => {
  it("encodes events as NDJSON lines", () => {
    expect(encodeTutorEvent({ type: "meta", conversationId: "c1" })).toBe(
      '{"type":"meta","conversationId":"c1"}\n'
    );
    expect(encodeTutorEvent({ type: "delta", text: "hi" })).toBe(
      '{"type":"delta","text":"hi"}\n'
    );
    expect(encodeTutorEvent({ type: "done", conversationId: "c1" })).toBe(
      '{"type":"done","conversationId":"c1"}\n'
    );
    expect(encodeTutorEvent({ type: "error", error: "oops" })).toBe(
      '{"type":"error","error":"oops"}\n'
    );
  });

  it("parses events, ignoring blanks and junk", () => {
    expect(parseTutorEvent("")).toBeNull();
    expect(parseTutorEvent("   ")).toBeNull();
    expect(parseTutorEvent("not json")).toBeNull();
    expect(parseTutorEvent(`{"type":"meta","conversationId":"abc"}`)).toEqual({
      type: "meta",
      conversationId: "abc",
    });
    expect(parseTutorEvent(`{"type":"delta","text":"hello"}`)).toEqual({
      type: "delta",
      text: "hello",
    });
    expect(parseTutorEvent(`{"type":"done","conversationId":"d1"}`)).toEqual({
      type: "done",
      conversationId: "d1",
    });
    expect(parseTutorEvent(`{"type":"error","error":"bad"}`)).toEqual({
      type: "error",
      error: "bad",
    });
    expect(parseTutorEvent(`{"type":"unknown"}`)).toBeNull();
  });

  it("reads a complete stream in order", async () => {
    const events: TutorStreamEvent[] = [];
    const rs = streamFromEvents([
      { type: "meta", conversationId: "c2" },
      { type: "delta", text: "A" },
      { type: "delta", text: "B" },
      { type: "done", conversationId: "c2" },
    ]);

    await readTutorStream(new Response(rs), (e) => events.push(e));

    expect(events).toEqual([
      { type: "meta", conversationId: "c2" },
      { type: "delta", text: "A" },
      { type: "delta", text: "B" },
      { type: "done", conversationId: "c2" },
    ]);
  });

  it("buffers partial lines across chunk boundaries", async () => {
    const events: TutorStreamEvent[] = [];
    const rs = streamFromStrings([
      '{"type":"meta","conversationId":"x"}\n{"type":"delta","text":"part',
      'ial"}\n{"type":"done","conversationId":"x"}\n',
    ]);

    await readTutorStream(new Response(rs), (e) => events.push(e));

    expect(events).toEqual([
      { type: "meta", conversationId: "x" },
      { type: "delta", text: "partial" },
      { type: "done", conversationId: "x" },
    ]);
  });

  it("stops early on error event", async () => {
    const events: TutorStreamEvent[] = [];
    const rs = streamFromEvents([
      { type: "meta", conversationId: "e1" },
      { type: "delta", text: "oops" },
      { type: "error", error: "model unavailable" },
      { type: "done", conversationId: "e1" }, // should never be read
    ]);

    await readTutorStream(new Response(rs), (e) => events.push(e));

    expect(events).toEqual([
      { type: "meta", conversationId: "e1" },
      { type: "delta", text: "oops" },
      { type: "error", error: "model unavailable" },
    ]);
  });

  it("maps failure messages", () => {
    expect(tutorFailureMessage(401, null)).toBe(
      "Your session has expired. Please sign in again."
    );
    expect(tutorFailureMessage(403, { error: "ACED Pro is required" })).toBe(
      "ACED Pro is required"
    );
    expect(tutorFailureMessage(409, { error: "note not ready" })).toBe(
      "note not ready"
    );
    expect(tutorFailureMessage(404, null)).toBe("We couldn't find that note or conversation.");
    expect(tutorFailureMessage(500, { foo: "bar" })).toBe(
      "Something went wrong on our end. Please try again."
    );
    expect(tutorFailureMessage(400, { error: "Note ID is required" })).toBe(
      "Note ID is required"
    );
  });
});