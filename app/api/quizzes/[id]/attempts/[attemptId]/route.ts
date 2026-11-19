import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";

export const runtime = "nodejs";

async function findOwnQuiz(userId: string, quizId: string) {
  return prisma.quiz.findFirst({
    where: { id: quizId, userId },
    include: {
      questions: { orderBy: { position: "asc" } },
    },
  });
}

async function findOwnAttempt(userId: string, quizId: string, attemptId: string) {
  const quiz = await findOwnQuiz(userId, quizId);
  if (!quiz) return null;
  return prisma.quizAttempt.findFirst({
    where: { id: attemptId, quizId },
    include: { answers: true },
  });
}

function attemptPayload(attempt: {
  id: string;
  quizId: string;
  userId: string;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  deadline: Date;
  score: number | null;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  answers?: {
    id: string;
    questionId: string;
    selectedIndex: number | null;
  }[];
}) {
  return {
    id: attempt.id,
    quizId: attempt.quizId,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    deadline: attempt.deadline.toISOString(),
    score: attempt.score,
    correctCount: attempt.correctCount,
    incorrectCount: attempt.incorrectCount,
    unansweredCount: attempt.unansweredCount,
    answers: (attempt.answers ?? []).map((a) => ({
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
    })),
  };
}

/**
 * GET /api/quizzes/[id]/attempts/[attemptId] — get a specific attempt with answers.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id, attemptId } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Quiz ID is required", 400);
  }
  if (typeof attemptId !== "string" || attemptId.trim() === "") {
    return jsonError("Attempt ID is required", 400);
  }

  const attempt = await findOwnAttempt(user.id, id.trim(), attemptId.trim());
  if (!attempt) return jsonError("Attempt not found", 404);

  // Also fetch the quiz questions for review
  const quiz = await findOwnQuiz(user.id, id.trim());
  const questions = quiz?.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    position: q.position,
  })) ?? [];

  return Response.json({ attempt: attemptPayload(attempt), questions });
}

/**
 * PATCH /api/quizzes/[id]/attempts/[attemptId] — submit answers and finish attempt.
 * Body: { answers: { questionId: string; selectedIndex: number | null }[] }
 *
 * Server-authoritative: deadline is checked, score is calculated server-side.
 * Once submitted, attempt cannot be modified.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id, attemptId } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Quiz ID is required", 400);
  }
  if (typeof attemptId !== "string" || attemptId.trim() === "") {
    return jsonError("Attempt ID is required", 400);
  }

  const attempt = await findOwnAttempt(user.id, id.trim(), attemptId.trim());
  if (!attempt) return jsonError("Attempt not found", 404);

  if (attempt.status !== "in_progress") {
    return jsonError("This attempt has already been submitted", 409);
  }

  // Check deadline (server-authoritative)
  const now = new Date();
  if (now > attempt.deadline) {
    // Auto-expire
    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { status: "expired", submittedAt: now },
    });
    return jsonError("Time is up. This attempt has expired.", 409);
  }

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const answersInput = (jsonBody as Record<string, unknown>).answers;
  if (!Array.isArray(answersInput)) {
    return jsonError("Answers must be an array", 400);
  }

  // Fetch quiz questions for scoring
  const quiz = await findOwnQuiz(user.id, id.trim());
  if (!quiz) return jsonError("Quiz not found", 404);

  const questionsById = new Map(quiz.questions.map((q) => [q.id, q]));

  // Validate and upsert answers
  const answerData = answersInput.map((a: unknown) => {
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      throw new Error("Invalid answer format");
    }
    const rec = a as Record<string, unknown>;
    const questionId = rec.questionId;
    const selectedIndex = rec.selectedIndex;
    if (typeof questionId !== "string" || questionId.trim() === "") {
      throw new Error("questionId is required");
    }
    if (selectedIndex !== null && (typeof selectedIndex !== "number" || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3)) {
      throw new Error("selectedIndex must be 0, 1, 2, 3, or null");
    }
    const question = questionsById.get(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }
    const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex;
    return {
      questionId,
      selectedIndex,
      isCorrect,
    };
  });

  // Score calculation
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const ans of answerData) {
    if (ans.selectedIndex === null) {
      unansweredCount++;
    } else if (ans.isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  }

  const totalQuestions = quiz.questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const submittedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // Upsert answers
      for (const ans of answerData) {
        await tx.quizAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: ans.questionId } },
          update: { selectedIndex: ans.selectedIndex },
          create: {
            attemptId: attempt.id,
            questionId: ans.questionId,
            selectedIndex: ans.selectedIndex,
          },
        });
      }

      // Update attempt
      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "submitted",
          submittedAt,
          score,
          correctCount,
          incorrectCount,
          unansweredCount,
        },
      });
    });

    const updatedAttempt = await findOwnAttempt(user.id, id.trim(), attemptId.trim());
    if (!updatedAttempt) return jsonError("Attempt not found after submission", 404);

    return Response.json({ attempt: attemptPayload(updatedAttempt) });
  } catch (error) {
    console.error("PATCH /api/quizzes/[id]/attempts/[attemptId] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}