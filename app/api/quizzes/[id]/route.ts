import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import { parseDifficulty, parseQuestionCount, validateQuizTitle } from "@/app/lib/ai/quiz-prompt";
import { createActivity } from "@/app/lib/activity";

export const runtime = "nodejs";

async function findOwnQuiz(userId: string, quizId: string) {
  return prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: {
      _count: { select: { questions: true, attempts: true } },
      questions: { orderBy: { position: "asc" } },
    },
  });
}

function quizDetailPayload(quiz: {
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
  questions?: {
    id: string;
    quizId: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
  }[];
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
    questions: (quiz.questions ?? []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      position: q.position,
    })),
  };
}

/**
 * GET /api/quizzes/[id] — get a single quiz with its questions.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Quiz ID is required", 400);
  }

  const quiz = await findOwnQuiz(user.id, id.trim());
  if (!quiz) return jsonError("Quiz not found", 404);

  return Response.json({ quiz: quizDetailPayload(quiz) });
}

/**
 * PATCH /api/quizzes/[id] — update quiz metadata (title, difficulty, timeLimit, questionCount).
 * Body: { title?, difficulty?, timeLimit?, questionCount? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const { id } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Quiz ID is required", 400);
  }

  const quiz = await findOwnQuiz(user.id, id.trim());
  if (!quiz) return jsonError("Quiz not found", 404);

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const updateData: Record<string, unknown> = {};

  const titleRaw = (jsonBody as Record<string, unknown>).title;
  if (titleRaw !== undefined) {
    if (titleRaw === null) {
      return jsonError("Title cannot be null", 400);
    }
    const result = validateQuizTitle(titleRaw);
    if ("error" in result) return jsonError(result.error, 400);
    updateData.title = result.title;
  }

  const difficultyRaw = (jsonBody as Record<string, unknown>).difficulty;
  if (difficultyRaw !== undefined) {
    if (difficultyRaw === null) {
      updateData.difficulty = null;
    } else {
      const result = parseDifficulty(difficultyRaw);
      if (!result) {
        return jsonError('Difficulty must be "easy", "medium", "hard", or "mixed"', 400);
      }
      updateData.difficulty = result;
    }
  }

  const timeLimitRaw = (jsonBody as Record<string, unknown>).timeLimit;
  if (timeLimitRaw !== undefined) {
    if (timeLimitRaw === null) {
      updateData.timeLimit = null;
    } else if (
      typeof timeLimitRaw !== "number" ||
      !Number.isInteger(timeLimitRaw) ||
      timeLimitRaw < 1 ||
      timeLimitRaw > 180
    ) {
      return jsonError("Time limit must be an integer between 1 and 180 minutes", 400);
    } else {
      updateData.timeLimit = timeLimitRaw;
    }
  }

  const questionCountRaw = (jsonBody as Record<string, unknown>).questionCount;
  if (questionCountRaw !== undefined) {
    if (questionCountRaw === null) {
      return jsonError("Question count cannot be null", 400);
    }
    const result = parseQuestionCount(questionCountRaw);
    if (!result) {
      return jsonError(
        `Question count must be an integer between 3 and 30`,
        400,
      );
    }
    updateData.questionCount = result;
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  try {
    const updated = await prisma.quiz.update({
      where: { id: quiz.id },
      data: updateData,
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });

    void createActivity({
      userId: user.id,
      type: "quiz_updated",
      label: `Updated quiz "${updated.title}"`,
    });

    return Response.json({ quiz: quizDetailPayload(updated) });
  } catch (error) {
    console.error("PATCH /api/quizzes/[id] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}

/**
 * DELETE /api/quizzes/[id] — delete a quiz and its questions/attempts.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Quiz ID is required", 400);
  }

  const quiz = await findOwnQuiz(user.id, id.trim());
  if (!quiz) return jsonError("Quiz not found", 404);

  try {
    await prisma.quiz.delete({ where: { id: quiz.id } });

    void createActivity({
      userId: user.id,
      type: "quiz_deleted",
      label: `Deleted quiz "${quiz.title}"`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/quizzes/[id] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}