/**
 * Quiz service.
 * Contains business logic for quiz operations.
 */

import {
  quizRepository,
  type QuizWithCounts,
  type QuizDetail,
  type QuizAttemptWithAnswers,
  type QuizQuestion,
  type QuizFilters,
  type CreateQuizData,
  type UpdateQuizData,
  type CreateQuestionData,
  type UpdateQuestionData,
  type SubmitAttemptData,
} from "@/app/lib/repositories";

import { BaseService, type ClientQuizQuestion } from "./base.service";
import { canUseFreeFeature, incrementUsage } from "@/app/lib/billing/limits";
import { generateText } from "@/app/lib/ai/ai";
import {
  buildQuizInput,
  parseQuizOutput,
  resolveQuizSourceText,
  type QuizDifficulty,
} from "@/app/lib/ai/quiz-prompt";
import { prisma } from "@/app/lib/auth";

type ClientQuizQuestionType = Pick<QuizQuestion, "id" | "prompt" | "options" | "position">;

const MODEL_UNAVAILABLE_MESSAGE = "Quiz unavailable right now. Please try again.";
const NOT_READY_MESSAGE = "This note isn't ready for a quiz yet. Wait for text extraction to finish, then try again.";
const UNREADABLE_MESSAGE = "We couldn't read this note. Try re-uploading it as a clearer PDF or image.";

export class QuizService extends BaseService {
  protected readonly resourceName = "Quiz";

  // ========================================================================
  // Quizzes
  // ========================================================================

  /**
   * List all quizzes for a user
   */
  async list(userId: string, filters: QuizFilters = {}): Promise<QuizServiceResponse<QuizWithCounts[]>> {
    return this.tryCatch(
      () => quizRepository.findManyByUserId(userId, filters),
      "Failed to list quizzes"
    );
  }

  /**
   * Paginated list of quizzes for a user
   */
  async listPaginated(
    userId: string,
    page: number,
    limit: number,
    filters: QuizFilters = {}
  ): Promise<QuizServiceResponse<{ items: QuizWithCounts[]; total: number; page: number; limit: number; totalPages: number }>> {
    return this.tryCatch(
      () => quizRepository.findManyByUserIdPaginated(userId, { page, limit }, filters),
      "Failed to list quizzes"
    );
  }

  /**
   * Get a single quiz by ID (with counts)
   */
  async getById(userId: string, quizId: string): Promise<QuizServiceResponse<QuizWithCounts | null>> {
    return this.tryCatch(async () => {
      const quiz = await quizRepository.findByIdAndUserId(quizId, userId);
      if (!quiz) {
        return this.notFoundError();
      }
      return this.success(quiz);
    }, "Failed to get quiz");
  }

  /**
   * Get a single quiz by ID with questions
   */
  async getDetailById(userId: string, quizId: string): Promise<QuizServiceResponse<QuizDetail | null>> {
    return this.tryCatch(async () => {
      const quiz = await quizRepository.findDetailByIdAndUserId(quizId, userId);
      if (!quiz) {
        return this.notFoundError();
      }
      return this.success(quiz);
    }, "Failed to get quiz");
  }

  /**
   * Create a manual quiz
   */
  async create(userId: string, data: CreateQuizData): Promise<QuizServiceResponse<QuizWithCounts>> {
    return this.tryCatch(async () => {
      // Check free tier limit for quizzes
      await this.checkQuota(userId, "quizzes", canUseFreeFeature, "quizzes");

      // Check for existing quiz with same idempotency key
      if (data.idempotencyKey) {
        const existing = await quizRepository.findByIdempotencyKey(userId, data.idempotencyKey);
        if (existing) {
          return this.success(existing);
        }
      }

      const quiz = await quizRepository.create(data);

      await this.incrementQuota(userId, "quizzes", incrementUsage);

      await this.logActivity({
        userId,
        type: "quiz_created",
        label: `Created quiz "${quiz.title}"`,
      });

      return this.success(quiz);
    }, "Failed to create quiz");
  }

  /**
   * Generate a quiz from a note using AI
   */
  async generateFromNote(
    userId: string,
    noteId: string,
    options: {
      title?: string;
      questionCount: number;
      difficulty: string;
      timeLimit: number | null;
      idempotencyKey?: string | null;
    }
  ): Promise<QuizServiceResponse<QuizWithCounts>> {
    return this.tryCatch(async () => {
      // Check free tier limit for quizzes
      await this.checkQuota(userId, "quizzes", canUseFreeFeature, "quizzes");

      // Check for existing quiz with same idempotency key
      if (options.idempotencyKey) {
        const existing = await quizRepository.findByIdempotencyKey(userId, options.idempotencyKey);
        if (existing) {
          return this.success(existing);
        }
      }

      // Find the note
      const note = await prisma.note.findFirst({
        where: { id: noteId, userId },
      });
      if (!note) {
        return this.notFoundError("Note");
      }

      // Resolve source text
      const noteText = resolveQuizSourceText({
        content: note.content,
        extractedText: note.extractedText,
        fileUrl: note.fileUrl,
        fileName: note.fileName,
        fileType: note.fileType,
      });

      if (!noteText) {
        if (note.extractionStatus === "failed") {
          return this.unprocessableEntityError(UNREADABLE_MESSAGE);
        }
        return this.conflictError(NOT_READY_MESSAGE);
      }

      const quizTitle = options.title ?? note.title;

      // Generate questions
      let raw: string;
      try {
        raw = await generateText(
          buildQuizInput(note.title, noteText, options.questionCount, options.difficulty as QuizDifficulty),
          { feature: "quiz" },
        );
      } catch {
        return this.serviceUnavailableError(MODEL_UNAVAILABLE_MESSAGE);
      }

      // Parse and validate AI output
      const questions = parseQuizOutput(raw, options.questionCount);
      if (!questions) {
        return this.serviceUnavailableError(MODEL_UNAVAILABLE_MESSAGE);
      }

      // Persist quiz and questions in transaction
      const created = await quizRepository.createWithQuestions(
        {
          title: quizTitle,
          difficulty: options.difficulty,
          questionCount: options.questionCount,
          timeLimit: options.timeLimit,
          sourceNoteId: noteId,
          userId,
          idempotencyKey: options.idempotencyKey,
        },
        questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation ?? null,
          position: 0, // Will be set by index in createWithQuestions
        }))
      );

      await this.incrementQuota(userId, "quizzes", incrementUsage);

      await this.logActivity({
        userId,
        type: "quiz_created",
        noteId,
        label: `Generated quiz "${created.quiz.title}" from "${note.title}"`,
      });

      return this.success(created.quiz);
    }, "Failed to generate quiz");
  }

  /**
   * Update a quiz
   */
  async update(userId: string, quizId: string, data: UpdateQuizData): Promise<QuizServiceResponse<QuizWithCounts>> {
    return this.tryCatch(async () => {
      // Verify ownership
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const quiz = await quizRepository.update(quizId, userId, data);

      await this.logActivity({
        userId,
        type: "quiz_updated",
        label: `Updated quiz "${quiz.title}"`,
      });

      return this.success(quiz);
    }, "Failed to update quiz");
  }

  /**
   * Delete a quiz
   */
  async delete(userId: string, quizId: string): Promise<QuizServiceResponse<{ deleted: true }>> {
    return this.tryCatch(async () => {
      const quiz = await quizRepository.findByIdAndUserId(quizId, userId);
      if (!quiz) {
        return this.notFoundError();
      }

      await quizRepository.delete(quizId, userId);

      await this.logActivity({
        userId,
        type: "quiz_deleted",
        label: `Deleted quiz "${quiz.title}"`,
      });

      return this.success({ deleted: true });
    }, "Failed to delete quiz");
  }

  // ========================================================================
  // Questions
  // ========================================================================

  /**
   * Get questions for a quiz
   */
  async getQuestions(userId: string, quizId: string): Promise<QuizServiceResponse<QuizQuestion[]>> {
    return this.tryCatch(async () => {
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const questions = await quizRepository.findQuestionsByQuizId(quizId);
      return this.success(questions);
    }, "Failed to get questions");
  }

  /**
   * Add a question to a quiz
   */
  async addQuestion(
    userId: string,
    quizId: string,
    data: Omit<CreateQuestionData, "quizId" | "position">
  ): Promise<QuizServiceResponse<QuizQuestion>> {
    return this.tryCatch(async () => {
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const position = await quizRepository.getMaxQuestionPosition(quizId);
      const question = await quizRepository.createQuestion({
        ...data,
        quizId,
        position: position + 1,
      });

      return this.success(question);
    }, "Failed to add question");
  }

  /**
   * Update a question
   */
  async updateQuestion(userId: string, quizId: string, questionId: string, data: UpdateQuestionData): Promise<QuizServiceResponse<QuizQuestion>> {
    return this.tryCatch(async () => {
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const question = await quizRepository.findQuestionById(quizId, questionId);
      if (!question) {
        return this.notFoundError("Question");
      }

      const updated = await quizRepository.updateQuestion(questionId, data);
      return this.success(updated);
    }, "Failed to update question");
  }

  /**
   * Delete a question
   */
  async deleteQuestion(userId: string, quizId: string, questionId: string): Promise<QuizServiceResponse<{ deleted: true }>> {
    return this.tryCatch(async () => {
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const question = await quizRepository.findQuestionById(quizId, questionId);
      if (!question) {
        return this.notFoundError("Question");
      }

      await quizRepository.deleteQuestion(questionId);
      return this.success({ deleted: true });
    }, "Failed to delete question");
  }

  // ========================================================================
  // Attempts
  // ========================================================================

  /**
   * Start a new quiz attempt (or resume existing)
   */
  async startAttempt(userId: string, quizId: string): Promise<QuizServiceResponse<{ attempt: QuizAttemptWithAnswers; questions: ClientQuizQuestionType[] }>> {
    return this.tryCatch(async () => {
      const quiz = await quizRepository.findDetailByIdAndUserId(quizId, userId);
      if (!quiz) {
        return this.notFoundError();
      }

      // Check for existing in-progress attempt
      const existingAttempt = await quizRepository.findInProgressAttempt(quizId, userId);
      if (existingAttempt) {
        const questions = quiz.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
          position: q.position,
        }));
        return this.success({ attempt: existingAttempt, questions });
      }

      // Calculate deadline
      const startedAt = new Date();
      let deadline: Date;
      if (quiz.timeLimit && quiz.timeLimit > 0) {
        deadline = new Date(startedAt.getTime() + quiz.timeLimit * 60 * 1000);
      } else {
        deadline = new Date(startedAt.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year for untimed
      }

      const attempt = await quizRepository.createAttempt({ quizId, userId, deadline });

      const questions = quiz.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        position: q.position,
      }));

      return this.success({ attempt, questions });
    }, "Failed to start attempt");
  }

  /**
   * Get attempts for a quiz
   */
  async getAttempts(userId: string, quizId: string): Promise<QuizServiceResponse<QuizAttemptWithAnswers[]>> {
    return this.tryCatch(async () => {
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const attempts = await quizRepository.findAttemptsByQuizAndUser(quizId, userId);
      return this.success(attempts);
    }, "Failed to get attempts");
  }

  /**
   * Get a specific attempt with questions for review
   */
  async getAttempt(userId: string, quizId: string, attemptId: string): Promise<QuizServiceResponse<{ attempt: QuizAttemptWithAnswers; questions: QuizQuestion[] }>> {
    return this.tryCatch(async () => {
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const attempt = await quizRepository.findAttemptById(attemptId);
      if (!attempt || attempt.quizId !== quizId) {
        return this.notFoundError("Attempt");
      }

      // Verify attempt belongs to user
      if (attempt.userId !== userId) {
        return this.forbiddenError("Attempt");
      }

      const quiz = await quizRepository.findDetailByIdAndUserId(quizId, userId);
      if (!quiz) {
        return this.notFoundError();
      }

      return this.success({ attempt, questions: quiz.questions });
    }, "Failed to get attempt");
  }

  /**
   * Submit an attempt
   */
  async submitAttempt(
    userId: string,
    quizId: string,
    attemptId: string,
    answersInput: Array<{ questionId: string; selectedIndex: number | null }>
  ): Promise<QuizServiceResponse<QuizAttemptWithAnswers>> {
    return this.tryCatch(async () => {
      const owns = await quizRepository.userOwnsQuiz(userId, quizId);
      if (!owns) {
        return this.forbiddenError();
      }

      const attempt = await quizRepository.findAttemptById(attemptId);
      if (!attempt || attempt.quizId !== quizId || attempt.userId !== userId) {
        return this.notFoundError("Attempt");
      }

      if (attempt.status !== "in_progress") {
        return this.conflictError("This attempt has already been submitted");
      }

      // Check deadline (server-authoritative)
      const now = new Date();
      if (now > attempt.deadline) {
        await quizRepository.expireAttempt(attemptId);
        return this.conflictError("Time is up. This attempt has expired.");
      }

      // Fetch quiz questions for scoring
      const quiz = await quizRepository.findDetailByIdAndUserId(quizId, userId);
      if (!quiz) {
        return this.notFoundError();
      }

      const questionsById = new Map(quiz.questions.map((q) => [q.id, q]));

      // Validate and prepare answers
      const answerData: SubmitAttemptData["answers"] = [];
      for (const a of answersInput) {
        if (!a || typeof a !== "object" || Array.isArray(a)) {
          return this.validationError("Invalid answer format");
        }
        const questionId = a.questionId;
        const selectedIndex = a.selectedIndex;
        if (typeof questionId !== "string" || questionId.trim() === "") {
          return this.validationError("questionId is required");
        }
        if (selectedIndex !== null && (typeof selectedIndex !== "number" || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3)) {
          return this.validationError("selectedIndex must be 0, 1, 2, 3, or null");
        }
        const question = questionsById.get(questionId);
        if (!question) {
          return this.validationError(`Question ${questionId} not found`);
        }
        const isCorrect = selectedIndex !== null && selectedIndex === question.correctIndex;
        answerData.push({ questionId, selectedIndex, isCorrect });
      }

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

      const updatedAttempt = await quizRepository.submitAttempt({
        attemptId,
        answers: answerData,
        score,
        correctCount,
        incorrectCount,
        unansweredCount,
        submittedAt,
      });

      await this.logActivity({
        userId,
        type: "quiz_attempt_submitted",
        label: `Submitted quiz attempt (score: ${score}%)`,
      });

      return this.success(updatedAttempt);
    }, "Failed to submit attempt");
  }
}

// Type exports for backward compatibility
export type QuizServiceResponse<T> = import("./base.service").ServiceResponse<T>;
export type QuizServiceResult<T> = import("./base.service").ServiceResult<T>;
export type QuizServiceError = import("./base.service").ServiceError;

// Singleton instance
export const quizService = new QuizService();