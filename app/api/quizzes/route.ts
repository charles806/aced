import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import {
  parseDifficulty,
  parseQuestionCount,
  validateIdempotencyKey,
  validateQuizTitle,
} from "@/app/lib/ai/quiz-prompt";
import { createActivity } from "@/app/lib/activity";

export const runtime = "nodejs";

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
 * GET /api/quizzes — list the user's quizzes with question/attempt counts.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const quizzes = await prisma.quiz.findMany({
    where: { userId: user.id },
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({ quizzes: quizzes.map(quizPayload) });
}

/**
 * POST /api/quizzes — create a manual quiz.
 * Body: { title, difficulty?, questionCount?, timeLimit?, sourceNoteId? }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const titleResult = validateQuizTitle(
    (jsonBody as Record<string, unknown>).title,
  );
  if ("error" in titleResult) return jsonError(titleResult.error, 400);

  const difficultyResult = parseDifficulty(
    (jsonBody as Record<string, unknown>).difficulty,
  );
  if (!difficultyResult) {
    return jsonError(
      'Difficulty must be "easy", "medium", "hard", or "mixed"',
      400,
    );
  }

  const countResult = parseQuestionCount(
    (jsonBody as Record<string, unknown>).questionCount,
  );
  if (!countResult) {
    return jsonError(
      `Question count must be an integer between ${3} and ${30}`,
      400,
    );
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

  const sourceNoteIdRaw = (jsonBody as Record<string, unknown>).sourceNoteId;
  let sourceNoteId: string | null = null;
  if (sourceNoteIdRaw !== undefined && sourceNoteIdRaw !== null) {
    if (typeof sourceNoteIdRaw !== "string" || sourceNoteIdRaw.trim() === "") {
      return jsonError("Source note ID must be a non-empty string", 400);
    }
    sourceNoteId = sourceNoteIdRaw.trim();

    const note = await prisma.note.findFirst({
      where: { id: sourceNoteId, userId: user.id },
    });
    if (!note) return jsonError("Source note not found", 404);
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
    if (existing) return Response.json(quizPayload(existing));
  }

  try {
    const quiz = await prisma.quiz.create({
      data: {
        title: titleResult.title,
        difficulty: difficultyResult,
        questionCount: countResult,
        timeLimit,
        sourceNoteId,
        userId: user.id,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    void createActivity({
      userId: user.id,
      type: "quiz_created",
      label: `Created quiz "${quiz.title}"`,
    });

    return Response.json({ quiz: quizPayload(quiz) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quizzes failed:", error);
    return jsonError("Something went wrong", 500);
  }
}