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
 * GET /api/quizzes/[id]/questions — list questions for a quiz.
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

  const questions = await prisma.quizQuestion.findMany({
    where: { quizId: quiz.id },
    orderBy: { position: "asc" },
  });

  return Response.json({ questions: questions.map(questionPayload) });
}

/**
 * POST /api/quizzes/[id]/questions — add a question to a quiz.
 * Body: { prompt, options: string[4], correctIndex: 0-3, explanation? }
 */
export async function POST(
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

  const prompt = (jsonBody as Record<string, unknown>).prompt;
  const options = (jsonBody as Record<string, unknown>).options;
  const correctIndex = (jsonBody as Record<string, unknown>).correctIndex;
  const explanation = (jsonBody as Record<string, unknown>).explanation;

  const result = validateQuestionFields(prompt, options, correctIndex, explanation);
  if ("error" in result) return jsonError(result.error, 400);

  // Get the max position for ordering
  const lastQuestion = await prisma.quizQuestion.findFirst({
    where: { quizId: quiz.id },
    orderBy: { position: "desc" },
  });
  const nextPosition = (lastQuestion?.position ?? -1) + 1;

  try {
    const created = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        prompt: result.prompt,
        options: result.options,
        correctIndex: result.correctIndex,
        explanation: result.explanation ?? null,
        position: nextPosition,
      },
    });

    return Response.json({ question: questionPayload(created) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quizzes/[id]/questions failed:", error);
    return jsonError("Something went wrong", 500);
  }
}