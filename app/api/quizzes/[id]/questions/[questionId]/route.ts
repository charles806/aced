import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import { validateQuestionFields } from "@/app/lib/ai/quiz-prompt";

export const runtime = "nodejs";

async function findOwnQuiz(userId: string, quizId: string) {
  return prisma.quiz.findFirst({
    where: { id: quizId, userId },
  });
}

async function findOwnQuestion(userId: string, quizId: string, questionId: string) {
  const quiz = await findOwnQuiz(userId, quizId);
  if (!quiz) return null;
  return prisma.quizQuestion.findFirst({
    where: { id: questionId, quizId },
  });
}

function questionPayload(question: {
  id: string;
  quizId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    position: question.position,
  };
}

/**
 * PATCH /api/quizzes/[id]/questions/[questionId] — edit a question.
 * Body: { prompt?, options?, correctIndex?, explanation? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const { id, questionId } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Quiz ID is required", 400);
  }
  if (typeof questionId !== "string" || questionId.trim() === "") {
    return jsonError("Question ID is required", 400);
  }

  const question = await findOwnQuestion(user.id, id.trim(), questionId.trim());
  if (!question) return jsonError("Question not found", 404);

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const body = jsonBody as Record<string, unknown>;
  const prompt = body.prompt ?? question.prompt;
  const options = body.options ?? question.options;
  const correctIndex = body.correctIndex ?? question.correctIndex;
  const explanation = body.explanation ?? question.explanation;

  const result = validateQuestionFields(prompt, options, correctIndex, explanation);
  if ("error" in result) return jsonError(result.error, 400);

  try {
    const updated = await prisma.quizQuestion.update({
      where: { id: question.id },
      data: {
        prompt: result.prompt,
        options: result.options,
        correctIndex: result.correctIndex,
        explanation: result.explanation ?? null,
      },
    });

    return Response.json({ question: questionPayload(updated) });
  } catch (error) {
    console.error("PATCH /api/quizzes/[id]/questions/[questionId] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}

/**
 * DELETE /api/quizzes/[id]/questions/[questionId] — delete a question.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id, questionId } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Quiz ID is required", 400);
  }
  if (typeof questionId !== "string" || questionId.trim() === "") {
    return jsonError("Question ID is required", 400);
  }

  const question = await findOwnQuestion(user.id, id.trim(), questionId.trim());
  if (!question) return jsonError("Question not found", 404);

  try {
    await prisma.quizQuestion.delete({ where: { id: question.id } });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/quizzes/[id]/questions/[questionId] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}