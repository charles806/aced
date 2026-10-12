import { NextResponse } from "next/server";
import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import { generateText } from "@/app/lib/ai/ai";
import {
  buildSummaryInput,
  isSummaryStale,
  parseSummaryLength,
  resolveSummaryText,
} from "@/app/lib/ai/summary-prompt";

export const runtime = "nodejs";

/**
 * The only message the browser ever sees when generation fails. The provider
 * error itself is logged server-side and never sent to the client.
 */
const MODEL_UNAVAILABLE_MESSAGE =
  "Summary unavailable right now. Please try again.";

const NOT_READY_MESSAGE =
  "This note isn't ready for AI yet. Wait for text extraction to finish, then try again.";

/** A `pending` row younger than this blocks a second POST (double-click guard). */
const PENDING_GRACE_MS = 2 * 60 * 1000;

function toSummaryPayload(note: {
  summary: string | null;
  summaryStatus: string;
  summaryUpdatedAt: Date | null;
  summaryLength: string | null;
  updatedAt: Date;
}) {
  return {
    summary: note.summary,
    summaryStatus: note.summaryStatus,
    summaryUpdatedAt: note.summaryUpdatedAt?.toISOString() ?? null,
    summaryLength: note.summaryLength,
    stale: isSummaryStale({
      updatedAt: note.updatedAt,
      summaryUpdatedAt: note.summaryUpdatedAt,
    }),
  };
}

/**
 * Return the cached summary (if any) plus a staleness flag. Never calls the
 * model — generation happens only via POST.
 *
 * `GET /api/notes/[id]/summary` → `{ summary, summaryStatus,
 * summaryUpdatedAt, summaryLength, stale }`.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  // 3. Validate + find the note — always scoped to the authenticated user.
  const { id } = await params;

  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Note ID is required", 400);
  }

  let note;

  try {
    note = await prisma.note.findFirst({
      where: { id: id.trim(), userId: user.id },
    });
  } catch (error) {
    console.error("GET /api/notes/[id]/summary note lookup failed:", error);
    return jsonError("Something went wrong", 500);
  }

  if (!note) {
    return jsonError("Note not found", 404);
  }

  // 4. Readiness: same rule as the Tutor — file notes need finished extraction,
  //    written notes need non-empty content.
  if (!resolveSummaryText(note)) {
    return jsonError(NOT_READY_MESSAGE, 409);
  }

  return NextResponse.json(toSummaryPayload(note));
}

/**
 * Generate (and cache) a summary.
 *
 * `POST /api/notes/[id]/summary` body: `{ force?: boolean,
 * length?: "short" | "detailed" }` (default `"detailed"`). Generation runs
 * only on cache miss, staleness, length switch, or `force: true` — otherwise
 * the cached row is returned with zero model calls.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  // 3. Validate body + id. Only `force` / `length` are read.
  const { id } = await params;

  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Note ID is required", 400);
  }

  const jsonBody = await safeJsonBody(req);
  const body = jsonBody ?? {};
  const { force } = body as { force?: unknown };
  const requestedLength = parseSummaryLength(
    "length" in body ? (body as { length?: unknown }).length : undefined,
  );

  if (!requestedLength) {
    return jsonError('Length must be "short" or "detailed"', 400);
  }

  // 4. Find the note — always scoped to the authenticated user. Never
  //    `findUnique` without the user scope.
  let note;

  try {
    note = await prisma.note.findFirst({
      where: { id: id.trim(), userId: user.id },
    });
  } catch (error) {
    console.error("POST /api/notes/[id]/summary note lookup failed:", error);
    return jsonError("Something went wrong", 500);
  }

  if (!note) {
    return jsonError("Note not found", 404);
  }

  // 5. The summarizer needs usable study material.
  const noteText = resolveSummaryText(note);

  if (!noteText) {
    return jsonError(NOT_READY_MESSAGE, 409);
  }

  const stale = isSummaryStale(note);

  // 6. Cache hit: completed, fresh, same length, not forced → zero model calls.
  if (
    note.summaryStatus === "completed" &&
    !stale &&
    note.summaryLength === requestedLength &&
    force !== true
  ) {
    return NextResponse.json(toSummaryPayload(note));
  }

  // 7. Double-POST guard: a recently-started generation is still running.
  if (
    note.summaryStatus === "pending" &&
    note.summaryUpdatedAt &&
    Date.now() - note.summaryUpdatedAt.getTime() < PENDING_GRACE_MS &&
    force !== true
  ) {
    return jsonError("Summary already generating", 409);
  }

  // 8. Mark pending first so a concurrent POST sees the guard above.
  try {
    await prisma.note.update({
      where: { id: note.id },
      data: { summaryStatus: "pending", summaryUpdatedAt: new Date() },
    });
  } catch (error) {
    console.error("POST /api/notes/[id]/summary pending mark failed:", error);
    return jsonError("Something went wrong", 500);
  }

  // 9. Generate. Provider errors are logged server-side and surfaced as one
  //    generic 502 — never leaked to the client.
  let summary: string;

  try {
    summary = await generateText(
      buildSummaryInput(note.title, noteText, requestedLength),
    );
  } catch (error) {
    console.error("POST /api/notes/[id]/summary model call failed:", error);

    try {
      await prisma.note.update({
        where: { id: note.id },
        data: { summaryStatus: "failed", summaryError: MODEL_UNAVAILABLE_MESSAGE },
      });
    } catch (updateError) {
      console.error(
        "POST /api/notes/[id]/summary failure persist failed:",
        updateError,
      );
    }

    return jsonError(MODEL_UNAVAILABLE_MESSAGE, 502);
  }

  if (!summary || summary.trim() === "") {
    console.error("POST /api/notes/[id]/summary model returned no text");

    try {
      await prisma.note.update({
        where: { id: note.id },
        data: { summaryStatus: "failed", summaryError: MODEL_UNAVAILABLE_MESSAGE },
      });
    } catch (updateError) {
      console.error(
        "POST /api/notes/[id]/summary empty persist failed:",
        updateError,
      );
    }

    return jsonError(MODEL_UNAVAILABLE_MESSAGE, 502);
  }

  // 10. Persist the artifact. `summaryModel` records the model; default to the
  //     env-configured model name when set.
  const modelName = process.env.DEFAULT_MODEL ?? null;

  try {
    const updated = await prisma.note.update({
      where: { id: note.id },
      data: {
        summary,
        summaryStatus: "completed",
        summaryUpdatedAt: new Date(),
        summaryModel: modelName,
        summaryLength: requestedLength,
        summaryError: null,
      },
    });

    return NextResponse.json(toSummaryPayload(updated));
  } catch (error) {
    console.error("POST /api/notes/[id]/summary persist failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
