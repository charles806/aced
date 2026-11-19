/**
 * Quiz repository.
 * Data access layer for quizzes, questions, and attempts.
 */

import { BaseRepository, type PaginatedResult } from "@/app/lib/repositories/base.repository";
import { prisma } from "@/app/lib/auth";
import { Prisma } from "@/app/generated/prisma/client";

export interface QuizWithCounts {
  id: string;
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  timeLimit: number | null;
  questionCount: number;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  _count: {
    questions: number;
    attempts: number;
  };
}

export interface QuizDetail extends QuizWithCounts {
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizAttemptWithAnswers {
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
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizFilters {
  sourceNoteId?: string;
}

export interface CreateQuizData {
  title: string;
  difficulty: string;
  questionCount: number;
  timeLimit: number | null;
  sourceNoteId: string | null;
  userId: string;
  idempotencyKey?: string | null;
}

export interface UpdateQuizData {
  title?: string;
  difficulty?: string | null;
  timeLimit?: number | null;
  questionCount?: number;
}

export interface CreateQuestionData {
  quizId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  position: number;
}

export interface UpdateQuestionData {
  prompt?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string | null;
}

export interface CreateAttemptData {
  quizId: string;
  userId: string;
  deadline: Date;
}

export interface SubmitAttemptData {
  attemptId: string;
  answers: Array<{
    questionId: string;
    selectedIndex: number | null;
    isCorrect: boolean;
  }>;
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  submittedAt: Date;
}

export class QuizRepository extends BaseRepository {
  /**
   * Find a quiz by ID and user ID with counts
   */
  async findByIdAndUserId(quizId: string, userId: string): Promise<QuizWithCounts | null> {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    return quiz as QuizWithCounts | null;
  }

  /**
   * Find a quiz by ID and user ID with questions
   */
  async findDetailByIdAndUserId(quizId: string, userId: string): Promise<QuizDetail | null> {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
      include: {
        _count: { select: { questions: true, attempts: true } },
        questions: { orderBy: { position: "asc" } },
      },
    });
    if (!quiz) return null;
    return {
      ...quiz,
      questions: quiz.questions as QuizQuestion[],
    };
  }

  /**
   * Find many quizzes by user ID with counts
   */
  async findManyByUserId(userId: string, filters: QuizFilters = {}): Promise<QuizWithCounts[]> {
    const where: Prisma.QuizWhereInput = { userId };
    if (filters.sourceNoteId) {
      where.sourceNoteId = filters.sourceNoteId;
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return quizzes as QuizWithCounts[];
  }

  /**
   * Find many quizzes by user ID with pagination
   */
  async findManyByUserIdPaginated(
    userId: string,
    pagination: { page: number; limit: number },
    filters: QuizFilters = {}
  ): Promise<PaginatedResult<QuizWithCounts>> {
    const where: Prisma.QuizWhereInput = { userId };
    if (filters.sourceNoteId) {
      where.sourceNoteId = filters.sourceNoteId;
    }

    return this.paginate(
      (args) => prisma.quiz.findMany({ ...args, include: { _count: { select: { questions: true, attempts: true } } } }) as Promise<QuizWithCounts[]>,
      (args) => prisma.quiz.count(args),
      where,
      { updatedAt: "desc" } as Prisma.QuizOrderByWithRelationInput,
      pagination
    );
  }

  /**
   * Find quiz by idempotency key
   */
  async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<QuizWithCounts | null> {
    const quiz = await prisma.quiz.findFirst({
      where: { userId, idempotencyKey },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    return quiz as QuizWithCounts | null;
  }

  /**
   * Create a new quiz
   */
  async create(data: CreateQuizData): Promise<QuizWithCounts> {
    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        difficulty: data.difficulty,
        questionCount: data.questionCount,
        timeLimit: data.timeLimit,
        sourceNoteId: data.sourceNoteId,
        userId: data.userId,
        idempotencyKey: data.idempotencyKey,
      },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    return quiz as QuizWithCounts;
  }

  /**
   * Create a quiz with questions in a transaction
   */
  async createWithQuestions(
    quizData: CreateQuizData,
    questions: Array<Omit<CreateQuestionData, "quizId">>
  ): Promise<{ quiz: QuizWithCounts; questionCount: number }> {
    const result = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: quizData.title,
          difficulty: quizData.difficulty,
          questionCount: quizData.questionCount,
          timeLimit: quizData.timeLimit,
          sourceNoteId: quizData.sourceNoteId,
          userId: quizData.userId,
          idempotencyKey: quizData.idempotencyKey,
        },
      });

      await tx.quizQuestion.createMany({
        data: questions.map((q, index) => ({
          quizId: quiz.id,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          position: index,
        })),
      });

      return { quiz, questionCount: questions.length };
    });

    // Fetch with counts
    const quizWithCounts = await this.findByIdAndUserId(result.quiz.id, quizData.userId);
    return { quiz: quizWithCounts!, questionCount: result.questionCount };
  }

  /**
   * Update a quiz
   */
  async update(quizId: string, userId: string, data: UpdateQuizData): Promise<QuizWithCounts> {
    const updateData: Prisma.QuizUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.difficulty !== undefined && data.difficulty !== null) updateData.difficulty = data.difficulty;
    if (data.timeLimit !== undefined) updateData.timeLimit = data.timeLimit;
    if (data.questionCount !== undefined) updateData.questionCount = data.questionCount;

    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    return quiz as QuizWithCounts;
  }

  /**
   * Delete a quiz
   */
  async delete(quizId: string, _userId: string): Promise<void> {
    await prisma.quiz.delete({
      where: { id: quizId },
    });
  }

  /**
   * Check if user owns a quiz
   */
  async userOwnsQuiz(userId: string, quizId: string): Promise<boolean> {
    const count = await prisma.quiz.count({
      where: { id: quizId, userId },
    });
    return count > 0;
  }

  // ========================================================================
  // Questions
  // ========================================================================

  /**
   * Find questions for a quiz
   */
  async findQuestionsByQuizId(quizId: string): Promise<QuizQuestion[]> {
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { position: "asc" },
    });
    return questions as QuizQuestion[];
  }

  /**
   * Find a question by ID and quiz ID
   */
  async findQuestionById(quizId: string, questionId: string): Promise<QuizQuestion | null> {
    const question = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
    });
    return question as QuizQuestion | null;
  }

  /**
   * Create a question
   */
  async createQuestion(data: CreateQuestionData): Promise<QuizQuestion> {
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: data.quizId,
        prompt: data.prompt,
        options: data.options,
        correctIndex: data.correctIndex,
        explanation: data.explanation,
        position: data.position,
      },
    });
    return question as QuizQuestion;
  }

  /**
   * Update a question
   */
  async updateQuestion(questionId: string, data: UpdateQuestionData): Promise<QuizQuestion> {
    const question = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        prompt: data.prompt,
        options: data.options,
        correctIndex: data.correctIndex,
        explanation: data.explanation,
      },
    });
    return question as QuizQuestion;
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    await prisma.quizQuestion.delete({
      where: { id: questionId },
    });
  }

  // ========================================================================
  // Attempts
  // ========================================================================

  /**
   * Find an in-progress attempt for a quiz and user
   */
  async findInProgressAttempt(quizId: string, userId: string): Promise<QuizAttemptWithAnswers | null> {
    const attempt = await prisma.quizAttempt.findFirst({
      where: { quizId, userId, status: "in_progress" },
      include: { answers: true },
    });
    return attempt as QuizAttemptWithAnswers | null;
  }

  /**
   * Find an attempt by ID
   */
  async findAttemptById(attemptId: string): Promise<QuizAttemptWithAnswers | null> {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    return attempt as QuizAttemptWithAnswers | null;
  }

  /**
   * Find attempts for a quiz and user
   */
  async findAttemptsByQuizAndUser(quizId: string, userId: string): Promise<QuizAttemptWithAnswers[]> {
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, userId },
      include: { answers: true },
      orderBy: { startedAt: "desc" },
    });
    return attempts as QuizAttemptWithAnswers[];
  }

  /**
   * Create a new attempt
   */
  async createAttempt(data: CreateAttemptData): Promise<QuizAttemptWithAnswers> {
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: data.quizId,
        userId: data.userId,
        status: "in_progress",
        startedAt: new Date(),
        deadline: data.deadline,
      },
      include: { answers: true },
    });
    return attempt as QuizAttemptWithAnswers;
  }

  /**
   * Submit an attempt with answers (transaction)
   */
  async submitAttempt(data: SubmitAttemptData): Promise<QuizAttemptWithAnswers> {
    const attempt = await prisma.$transaction(async (tx) => {
      // Upsert answers
      for (const ans of data.answers) {
        await tx.quizAnswer.upsert({
          where: { attemptId_questionId: { attemptId: data.attemptId, questionId: ans.questionId } },
          update: { selectedIndex: ans.selectedIndex },
          create: {
            attemptId: data.attemptId,
            questionId: ans.questionId,
            selectedIndex: ans.selectedIndex,
          },
        });
      }

      // Update attempt
      const updated = await tx.quizAttempt.update({
        where: { id: data.attemptId },
        data: {
          status: "submitted",
          submittedAt: data.submittedAt,
          score: data.score,
          correctCount: data.correctCount,
          incorrectCount: data.incorrectCount,
          unansweredCount: data.unansweredCount,
        },
        include: { answers: true },
      });
      return updated as QuizAttemptWithAnswers;
    });

    return attempt;
  }

  /**
   * Expire an attempt
   */
  async expireAttempt(attemptId: string): Promise<void> {
    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { status: "expired", submittedAt: new Date() },
    });
  }

  /**
   * Get max question position for a quiz
   */
  async getMaxQuestionPosition(quizId: string): Promise<number> {
    const lastQuestion = await prisma.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    return lastQuestion?.position ?? -1;
  }
}

// Singleton instance
export const quizRepository = new QuizRepository();