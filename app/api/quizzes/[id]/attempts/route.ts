import { jsonError } from "@/app/lib/api";
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
 * POST /api/quizzes/[id]/attempts — start a new quiz attempt.
 * Body: {}
 *
 * Creates an attempt with a server-authoritative deadline based on quiz.timeLimit.
 * If no timeLimit, deadline is far future (untimed).
 * Returns the attempt with the quiz questions (without correctIndex).
 */
export async function POST(
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

  // Check for an existing in-progress attempt (resume support)
  const existingAttempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId: quiz.id,
      userId: user.id,
      status: "in_progress",
    },
    include: {
      answers: true,
    },
  });

  if (existingAttempt) {
    // Return existing attempt with questions (minus correct answers)
    const questions = quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      position: q.position,
    }));
    return Response.json({
      attempt: attemptPayload(existingAttempt),
      questions,
    });
  }

  // Calculate deadline based on timeLimit
  const startedAt = new Date();
  let deadline: Date;
  if (quiz.timeLimit && quiz.timeLimit > 0) {
    deadline = new Date(startedAt.getTime() + quiz.timeLimit * 60 * 1000);
  } else {
    // Far future for untimed quizzes (1 year)
    deadline = new Date(startedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
  }

  try {
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        status: "in_progress",
        startedAt,
        deadline,
      },
      include: { answers: true },
    });

    // Return questions without correctIndex for the exam UI
    const questions = quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      position: q.position,
    }));

    return Response.json({
      attempt: attemptPayload(attempt),
      questions,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quizzes/[id]/attempts failed:", error);
    return jsonError("Something went wrong", 500);
  }
}

/**
 * GET /api/quizzes/[id]/attempts — list user's attempts for this quiz.
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

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: quiz.id, userId: user.id },
    include: { answers: true },
    orderBy: { startedAt: "desc" },
  });

  return Response.json({ attempts: attempts.map(attemptPayload) });
}