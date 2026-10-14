import { NextResponse } from "next/server";
import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import { streamText } from "@/app/lib/ai/ai";
import {
    encodeTutorEvent,
    TUTOR_STREAM_CONTENT_TYPE,
    type TutorStreamEvent,
} from "@/app/lib/ai/tutor-events";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Keeps a single student question from becoming an unbounded prompt. */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * The only message the browser ever sees when generation fails. The provider
 * error itself is logged server-side and never sent to the client.
 */
const MODEL_UNAVAILABLE_MESSAGE =
    "The AI tutor is unavailable right now. Please try again.";

const TUTOR_INSTRUCTIONS = `You are ACED's study tutor. You help a student understand their own study material.

Rules:
- The study material below is the student's note and your primary source. Base your answer on it.
- Explain clearly, at the student's level. Keep it focused and useful.
- Never claim something came from the note when it did not.
- If the material does not contain enough information to answer, say so plainly instead of guessing.
- Reply with the explanation only. No preamble, no restating the question.`;

const GENERAL_TUTOR_INSTRUCTIONS = `You are ACED's general study tutor. You help a student with any academic question.

Rules:
- Answer clearly, at the student's level. Keep it focused and useful.
- Be helpful and accurate. If you are uncertain, say so plainly instead of guessing.
- Reply with the explanation only. No preamble, no restating the question.`;

/**
 * Tutor instructions + the student's note + the student's question.
 * Everything the model sees for a request goes through here.
 */
function buildTutorInput(noteTitle: string, noteText: string, message: string) {
    return [
        TUTOR_INSTRUCTIONS,
        "",
        "--- STUDY MATERIAL (the student's note) ---",
        `Note title: ${noteTitle}`,
        noteText,
        "--- END STUDY MATERIAL ---",
        "",
        "--- STUDENT QUESTION ---",
        message,
        "--- END STUDENT QUESTION ---",
    ].join("\n");
}

/**
 * Tutor instructions + the student's note + conversation history + current question.
 */
function buildTutorInputWithHistory(
    noteTitle: string,
    noteText: string,
    history: Array<{ role: string; content: string }>,
    message: string
) {
    const parts = [
        TUTOR_INSTRUCTIONS,
        "",
        "--- STUDY MATERIAL (the student's note) ---",
        `Note title: ${noteTitle}`,
        noteText,
        "--- END STUDY MATERIAL ---",
        "",
    ];

    if (history.length > 0) {
        parts.push("--- CONVERSATION HISTORY ---");
        for (const h of history) {
            parts.push(`${h.role}: ${h.content}`);
        }
        parts.push("--- END CONVERSATION HISTORY ---");
        parts.push("");
    }

    parts.push("--- STUDENT QUESTION ---");
    parts.push(message);
    parts.push("--- END STUDENT QUESTION ---");

    return parts.join("\n");
}

function buildGeneralTutorInput(message: string) {
    return [
        GENERAL_TUTOR_INSTRUCTIONS,
        "",
        "--- STUDENT QUESTION ---",
        message,
        "--- END STUDENT QUESTION ---",
    ].join("\n");
}

function buildGeneralTutorInputWithHistory(
    history: Array<{ role: string; content: string }>,
    message: string,
) {
    const parts = [GENERAL_TUTOR_INSTRUCTIONS, ""];
    if (history.length > 0) {
        parts.push("--- CONVERSATION HISTORY ---");
        for (const h of history) {
            parts.push(`${h.role}: ${h.content}`);
        }
        parts.push("--- END CONVERSATION HISTORY ---");
        parts.push("");
    }
    parts.push("--- STUDENT QUESTION ---");
    parts.push(message);
    parts.push("--- END STUDENT QUESTION ---");
    return parts.join("\n");
}

function isAbortError(error: unknown): boolean {
    return (
        error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "TimeoutError")
    );
}

/**
 * Existing conversation: verify ownership, verify it belongs to this note, and
 * read its history. Returns `null` with a JSON error response when the
 * conversation can't be used, so the caller can bail out before streaming.
 */
async function loadExistingConversation(
    userId: string,
    conversationId: string,
    noteId: string | null
): Promise<
    | { ok: true; conversation: { id: string; history: Array<{ role: string; content: string }> } }
    | { ok: false; response: Response }
> {
    const conversation = await prisma.aIConversation.findFirst({
        where: {
            id: conversationId,
            userId,
        },
        include: {
            messages: {
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });

    if (!conversation) {
        return { ok: false, response: jsonError("Conversation not found", 404) };
    }

    // Strict cross-note check: general (null) and note-specific conversations are not interchangeable.
    if (conversation.noteId !== noteId) {
        return {
            ok: false,
            response: jsonError("Conversation does not belong to this note", 400),
        };
    }

    return {
        ok: true,
        conversation: {
            id: conversation.id,
            history: conversation.messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
        },
    };
}

/**
 * Reopen an existing conversation so a refresh doesn't lose the transcript.
 *
 * `GET /api/ai/tutor?conversationId=…[&noteId=…]` → `{ conversationId, noteId,
 * messages }`. No listing, search, renaming or deletion — just the one
 * conversation the browser already holds an id for.
 */
export async function GET(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const proAccess = await requireProAccess(user.id);

    if (!proAccess.ok) {
        return proAccess.response;
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (typeof conversationId !== "string" || conversationId.trim() === "") {
        return jsonError("Conversation ID is required", 400);
    }

    const noteIdParam = searchParams.get("noteId");
    const noteId =
        typeof noteIdParam === "string" && noteIdParam.trim() !== ""
            ? noteIdParam.trim()
            : null;

    try {
        const conversation = await prisma.aIConversation.findFirst({
            where: {
                id: conversationId.trim(),
                userId: user.id,
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!conversation) {
            return jsonError("Conversation not found", 404);
        }

        if (conversation.noteId !== noteId) {
            return jsonError("Conversation does not belong to this note", 400);
        }

        return NextResponse.json({
            conversationId: conversation.id,
            noteId: conversation.noteId,
            messages: conversation.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("GET /api/ai/tutor conversation lookup failed:", error);
        return jsonError("Something went wrong", 500);
    }
}

/**
 * Ask the tutor a question and stream the answer back.
 *
 * Everything that can be rejected (auth, Pro, validation, note ownership,
 * extraction readiness, conversation ownership, the note/conversation link) is
 * still resolved *before* the stream opens, so those failures stay plain JSON
 * responses with a status code. Once the stream is open the client gets
 * newline-delimited JSON events — see `app/lib/ai/tutor-events.ts` for the
 * protocol: `meta` (carries the conversationId) → zero or more `delta` → then
 * exactly one terminal `done` or `error`.
 *
 * The user's message is saved before the model is called and is kept even if
 * generation fails. The assistant's reply is accumulated by the AI layer and
 * persisted as exactly one `AIMessage` only after the stream completes
 * successfully.
 */
export async function POST(req: Request) {
    // 1. Authenticate.
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    // 2. Pro access. Server-side only — the frontend never decides this.
    const proAccess = await requireProAccess(user.id);

    if (!proAccess.ok) {
        return proAccess.response;
    }

    // 3. Validate. Only noteId and message are read; userId / isPro /
    // extractedText sent by the client are ignored.
    const jsonBody = await safeJsonBody(req);

    if (!jsonBody) {
        return jsonError(
            "Invalid request body. Expected JSON with a noteId and a message.",
            400
        );
    }

    const { noteId, message, conversationId } = jsonBody as {
        noteId?: unknown;
        message?: unknown;
        conversationId?: unknown;
    };

    // noteId may be string (note-specific) or null (general chat). Keep typed-question when switching.
    let resolvedNoteId: string | null = null;
    if (noteId === null) {
        resolvedNoteId = null;
    } else if (typeof noteId === "string" && noteId.trim() !== "") {
        resolvedNoteId = noteId.trim();
    } else if (noteId === undefined) {
        // Treat missing as general for forward-compat, but we require explicit null for general in UI
        resolvedNoteId = null;
    } else {
        return jsonError("Note ID must be a string or null", 400);
    }

    if (typeof message !== "string" || message.trim() === "") {
        return jsonError("Message is required", 400);
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
        return jsonError(
            `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
            400
        );
    }

    // 4. Find the note — always scoped to the authenticated user (if noteId provided).
    let note: { id: string; title: string; extractedText: string | null; extractionStatus: string; content: string | null } | null = null;
    let material: string | null = null;

    if (resolvedNoteId !== null) {
        try {
            note = await prisma.note.findFirst({
                where: {
                    id: resolvedNoteId,
                    userId: user.id,
                },
                select: {
                    id: true,
                    title: true,
                    extractedText: true,
                    extractionStatus: true,
                    content: true,
                },
            });
        } catch (error) {
            console.error("POST /api/ai/tutor note lookup failed:", error);
            return jsonError("Something went wrong", 500);
        }

        if (!note) {
            return jsonError("Note not found", 404);
        }

        // 5. The tutor needs usable study material.
        material =
            (note.extractionStatus === "completed"
                ? note.extractedText?.trim()
                : "") ||
            note.content?.trim() ||
            "";

        if (!material) {
            if (note.extractionStatus === "failed") {
                return jsonError(
                    "We couldn't read this note. Try re-uploading it as a clearer PDF or image.",
                    422
                );
            }

            return jsonError(
                "This note isn't ready for AI yet. Wait for text extraction to finish, then try again.",
                409
            );
        }
    }

    // 6. Resolve the conversation, save the student's message, and build the
    //    model input. All of this happens before the stream opens so failures
    //    are still ordinary JSON errors with a status code.
    const studentMessage = message.trim();
    let conversationIdForTurn: string;
    let input: string;

    try {
        if (typeof conversationId === "string" && conversationId.trim() !== "") {
            const existing = await loadExistingConversation(
                user.id,
                conversationId.trim(),
                resolvedNoteId
            );

            if (!existing.ok) {
                return existing.response;
            }

            await prisma.aIMessage.create({
                data: {
                    conversationId: existing.conversation.id,
                    role: "user",
                    content: studentMessage,
                },
            });

            conversationIdForTurn = existing.conversation.id;
            if (resolvedNoteId !== null && note && material) {
                input = buildTutorInputWithHistory(
                    note.title,
                    material,
                    existing.conversation.history,
                    studentMessage
                );
            } else {
                input = buildGeneralTutorInputWithHistory(
                    existing.conversation.history,
                    studentMessage
                );
            }
        } else {
            const newConversation = await prisma.aIConversation.create({
                data: {
                    userId: user.id,
                    noteId: resolvedNoteId,
                },
            });

            await prisma.aIMessage.create({
                data: {
                    conversationId: newConversation.id,
                    role: "user",
                    content: studentMessage,
                },
            });

            conversationIdForTurn = newConversation.id;
            if (resolvedNoteId !== null && note && material) {
                input = buildTutorInput(note.title, material, studentMessage);
            } else {
                input = buildGeneralTutorInput(studentMessage);
            }
        }
    } catch (error) {
        console.error("POST /api/ai/tutor persistence failed:", error);
        return jsonError("Something went wrong", 500);
    }

    // 7. Stream the answer. `streamText` accumulates the full reply and resolves
    //    it only after the provider stream finishes; that resolved string is the
    //    single assistant message we persist.
    const encoder = new TextEncoder();
    const abort = new AbortController();

    req.signal.addEventListener("abort", () => abort.abort(), { once: true });

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            let closed = false;

            const send = (event: TutorStreamEvent): boolean => {
                if (closed) return false;

                try {
                    controller.enqueue(encoder.encode(encodeTutorEvent(event)));
                    return true;
                } catch {
                    closed = true;
                    return false;
                }
            };

            void (async () => {
                if (!send({ type: "meta", conversationId: conversationIdForTurn })) {
                    abort.abort();
                    controller.close();
                    return;
                }

                try {
                    const answer = await streamText(input, {
                        onDelta: (text) => {
                            send({ type: "delta", text });
                        },
                        signal: abort.signal,
                    });

                    if (closed || abort.signal.aborted) {
                        // Client went away mid-stream: don't write a reply the
                        // student never saw.
                        return;
                    }

                    await prisma.aIMessage.create({
                        data: {
                            conversationId: conversationIdForTurn,
                            role: "assistant",
                            content: answer,
                        },
                    });

                    send({ type: "done", conversationId: conversationIdForTurn });
                } catch (error) {
                    if (!isAbortError(error) && !abort.signal.aborted) {
                        console.error(
                            "POST /api/ai/tutor model stream failed:",
                            error
                        );
                    }

                    // The student's message stays saved; no partial assistant
                    // message is written, and the client gets one safe sentence.
                    send({ type: "error", error: MODEL_UNAVAILABLE_MESSAGE });
                } finally {
                    closed = true;

                    try {
                        controller.close();
                    } catch {
                        // Already closed by the consumer.
                    }
                }
            })();
        },
        cancel() {
            abort.abort();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": TUTOR_STREAM_CONTENT_TYPE,
            "Cache-Control": "no-cache, no-store, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}