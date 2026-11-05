import { NextResponse } from "next/server";
import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import { generateText } from "@/app/lib/ai/ai";
import {
  buildQuizInput,
  parseDifficulty,
  parseQuestionCount,
  parseQuizOutput,
  resolveQuizSourceText,
  validateIdempotencyKey,
  validateQuizTitle,
} from "@/app/lib/ai/quiz-prompt";
import { createActivity } from "@/app/lib/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL_UNAVAILABLE_MESSAGE =
  "Quiz unavailable right now. Please try again.";

const NOT_READY_MESSAGE =
  "This note isn't ready for a quiz yet. Wait for text extraction to finish, then try again.";

const UNREADABLE_MESSAGE =
  "We couldn't read this note. Try re-uploading it as a clearer PDF or image.";

function quizPayload(quiz: {
  id: string;
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  timeLimit: number | null;
  questionCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  _count?: { questions: number; attempts: number };
}) {
  return {
    id: quiz.id,
    title: quiz.title,
    difficulty: quiz.difficulty ?? null,
    sourceNoteId: quiz.sourceNoteId ?? null,
    timeLimit: quiz.timeLimit ?? null,
    questionCount: quiz.questionCount,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
    _count: {
      questions: quiz._count?.questions ?? 0,
      attempts: quiz._count?.attempts ?? 0,
    },
  };
}

/**
 * POST /api/quizzes/generate — generate questions from an owned note using AI.
 * Body: { noteId, title?, questionCount?, difficulty?, timeLimit?, idempotencyKey? }
 */
export async function POST(req: Request) {
  // 1. Authenticate.
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  // 2. Pro access. Server-side only — the frontend never decides this.
  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  // 3. Validate body.
  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const noteIdRaw = (jsonBody as Record<string, unknown>).noteId;
  if (typeof noteIdRaw !== "string" || noteIdRaw.trim() === "") {
    return jsonError("Note ID is required", 400);
  }
  const noteId = noteIdRaw.trim();

  const count = parseQuestionCount((jsonBody as Record<string, unknown>).questionCount);
  if (!count) {
    return jsonError(`Question count must be an integer between 3 and 30`, 400);
  }

  const difficulty = parseDifficulty(
    (jsonBody as Record<string, unknown>).difficulty,
  );
  if (!difficulty) {
    return jsonError('Difficulty must be "easy", "medium", "hard", or "mixed"', 400);
  }

  const timeLimitRaw = (jsonBody as Record<string, unknown>).timeLimit;
  let timeLimit: number | null = null;
  if (timeLimitRaw !== undefined && timeLimitRaw !== null) {
    if (typeof timeLimitRaw !== "number" || !Number.isInteger(timeLimitRaw)) {
      return jsonError("Time limit must be an integer (minutes)", 400);
    }
    if (timeLimitRaw < 1 || timeLimitRaw > 180) {
      return jsonError("Time limit must be between 1 and 180 minutes", 400);
    }
    timeLimit = timeLimitRaw;
  }

  const titleRaw = (jsonBody as Record<string, unknown>).title;
  let quizTitle: string;
  if (titleRaw !== undefined && titleRaw !== null) {
    const result = validateQuizTitle(titleRaw);
    if ("error" in result) return jsonError(result.error, 400);
    quizTitle = result.title;
  } else {
    quizTitle = undefined as unknown as string; // filled after note lookup
  }

  const idempotencyResult = validateIdempotencyKey(
    (jsonBody as Record<string, unknown>).idempotencyKey,
  );
  if ("error" in idempotencyResult) return jsonError(idempotencyResult.error, 400);
  const idempotencyKey = idempotencyResult.key;

  if (idempotencyKey) {
    const existing = await prisma.quiz.findFirst({
      where: { userId: user.id, idempotencyKey },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    if (existing) return NextResponse.json({ quiz: quizPayload(existing) });
  }

  // 4. Find the note — always scoped to the authenticated user.
  let note;
  try {
    note = await prisma.note.findFirst({
      where: { id: noteId, userId: user.id },
    });
  } catch (error) {
    console.error("POST /api/quizzes/generate note lookup failed:", error);
    return jsonError("Something went wrong", 500);
  }

  if (!note) return jsonError("Note not found", 404);

  if (!quizTitle) quizTitle = note.title;

  // 5. Readiness — same rule as summaries and the tutor.
  const noteText = resolveQuizSourceText({
    content: note.content,
    extractedText: note.extractedText,
    fileUrl: note.fileUrl,
    fileName: note.fileName,
    fileType: note.fileType,
  });

  if (!noteText) {
    if (note.extractionStatus === "failed") {
      return jsonError(UNREADABLE_MESSAGE, 422);
    }
    return jsonError(NOT_READY_MESSAGE, 409);
  }

  // 6. Generate. Provider errors are logged server-side and surfaced as one
  //    generic 502 — never leaked to the client.
  let raw: string;
  try {
    raw = await generateText(
      buildQuizInput(note.title, noteText, count, difficulty),
      { feature: "quiz" },
    );
  } catch (error) {
    console.error("POST /api/quizzes/generate model call failed:", error);
    return jsonError(MODEL_UNAVAILABLE_MESSAGE, 502);
  }

  // 7. Validate and normalize — never trust AI output as structured data.
  const questions = parseQuizOutput(raw, count);
  if (!questions) {
    return jsonError(MODEL_UNAVAILABLE_MESSAGE, 502);
  }

  // 8. Persist in a transaction so we never save a quiz without its questions.
  try {
    const created = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: quizTitle,
          difficulty,
          questionCount: count,
          timeLimit,
          sourceNoteId: noteId,
          userId: user.id,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });

      await tx.quizQuestion.createMany({
        data: questions.map((q, index) => ({
          quizId: quiz.id,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation ?? null,
          position: index,
        })),
      });

      return { quiz, questionCount: questions.length };
    });

    void createActivity({
      userId: user.id,
      type: "quiz_created",
      noteId,
      label: `Generated quiz "${created.quiz.title}" from "${note.title}"`,
    });

    return NextResponse.json({
      quiz: quizPayload({
        ...created.quiz,
        _count: { questions: created.questionCount, attempts: 0 },
      }),
    });
  } catch (error) {
    console.error("POST /api/quizzes/generate persist failed:", error);
    return jsonError("Something went wrong", 500);
  }
}