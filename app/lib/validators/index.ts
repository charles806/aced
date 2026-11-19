/**
 * Zod validation schemas.
 * Single source of truth for input validation.
 */

import { z } from "zod";
import {
  VALIDATION,
  FLASHCARD_PROGRESS_STATUS,
  FILE_UPLOAD,
} from "@/app/lib/config/constants";

// ============================================================================
// Common Schemas
// ============================================================================

export const uuidSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const idempotencyKeySchema = z.string().max(64).optional().nullable();

// ============================================================================
// Subject Schemas
// ============================================================================

export const createSubjectSchema = z.object({
  name: z.string().min(1).max(VALIDATION.SUBJECT_NAME_MAX_LENGTH).trim(),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(VALIDATION.SUBJECT_NAME_MAX_LENGTH).trim().optional(),
});

export const subjectIdParamSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// Note Schemas
// ============================================================================

export const noteFiltersSchema = z.object({
  subjectId: uuidSchema.optional(),
  search: z.string().max(100).optional(),
  fileType: z.string().max(50).optional(),
});

export const createWrittenNoteSchema = z.object({
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim(),
  subjectId: uuidSchema,
  content: z.string().min(1).max(VALIDATION.NOTE_CONTENT_MAX_LENGTH),
});

export const createFileNoteSchema = z.object({
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim(),
  subjectId: uuidSchema,
  fileName: z.string().min(1).max(FILE_UPLOAD.MAX_FILE_NAME_LENGTH),
  fileType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]),
  fileUrl: z.string().url(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim().optional(),
  subjectId: uuidSchema.optional(),
  content: z.string().max(VALIDATION.NOTE_CONTENT_MAX_LENGTH).optional().nullable(),
});

export const noteIdParamSchema = z.object({
  id: uuidSchema,
});

export const reextractNoteSchema = z.object({
  // Empty body for re-extraction
});

// ============================================================================
// Flashcard Schemas
// ============================================================================

export const createDeckSchema = z.object({
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim(),
  difficulty: z.enum(VALIDATION.FLASHCARD_DIFFICULTY_VALUES).optional(),
  sourceNoteId: uuidSchema.optional().nullable(),
  idempotencyKey: idempotencyKeySchema,
});

export const updateDeckSchema = z.object({
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim().optional(),
  difficulty: z.enum(VALIDATION.FLASHCARD_DIFFICULTY_VALUES).optional().nullable(),
});

export const addCardSchema = z.object({
  front: z.string().min(1).max(5000),
  back: z.string().min(1).max(5000),
  position: z.number().int().nonnegative().optional(),
});

export const updateCardSchema = z.object({
  front: z.string().min(1).max(5000).optional(),
  back: z.string().min(1).max(5000).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const cardProgressSchema = z.object({
  status: z.enum(FLASHCARD_PROGRESS_STATUS),
});

export const deckIdParamSchema = z.object({
  id: uuidSchema,
});

export const cardIdParamSchema = z.object({
  id: uuidSchema,
  cardId: uuidSchema,
});

export const generateDeckSchema = z.object({
  noteId: uuidSchema,
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim().optional().nullable(),
  count: z.number().int().min(3).max(30).default(10),
  difficulty: z.enum(VALIDATION.FLASHCARD_DIFFICULTY_VALUES).default("mixed"),
  idempotencyKey: idempotencyKeySchema,
});

export const deckFiltersSchema = z.object({
  sourceNoteId: uuidSchema.optional(),
});

// ============================================================================
// Quiz Schemas
// ============================================================================

export const createQuizSchema = z.object({
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim(),
  difficulty: z.enum(VALIDATION.QUIZ_DIFFICULTY_VALUES).default("mixed"),
  questionCount: z.number().int().min(VALIDATION.QUIZ_QUESTION_COUNT_MIN).max(VALIDATION.QUIZ_QUESTION_COUNT_MAX).default(10),
  timeLimit: z.number().int().min(VALIDATION.QUIZ_TIME_LIMIT_MIN).max(VALIDATION.QUIZ_TIME_LIMIT_MAX).optional().nullable(),
  sourceNoteId: uuidSchema.optional().nullable(),
  idempotencyKey: idempotencyKeySchema,
});

export const updateQuizSchema = z.object({
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim().optional(),
  difficulty: z.enum(VALIDATION.QUIZ_DIFFICULTY_VALUES).optional().nullable(),
  questionCount: z.number().int().min(VALIDATION.QUIZ_QUESTION_COUNT_MIN).max(VALIDATION.QUIZ_QUESTION_COUNT_MAX).optional(),
  timeLimit: z.number().int().min(VALIDATION.QUIZ_TIME_LIMIT_MIN).max(VALIDATION.QUIZ_TIME_LIMIT_MAX).optional().nullable(),
  sourceNoteId: uuidSchema.optional().nullable(),
});

export const generateQuizSchema = z.object({
  noteId: uuidSchema,
  title: z.string().min(1).max(VALIDATION.TITLE_MAX_LENGTH).trim().optional().nullable(),
  questionCount: z.number().int().min(VALIDATION.QUIZ_QUESTION_COUNT_MIN).max(VALIDATION.QUIZ_QUESTION_COUNT_MAX).default(10),
  difficulty: z.enum(VALIDATION.QUIZ_DIFFICULTY_VALUES).default("mixed"),
  timeLimit: z.number().int().min(VALIDATION.QUIZ_TIME_LIMIT_MIN).max(VALIDATION.QUIZ_TIME_LIMIT_MAX).optional().nullable(),
  idempotencyKey: idempotencyKeySchema,
});

export const quizFiltersSchema = z.object({
  sourceNoteId: uuidSchema.optional(),
});

export const addQuestionSchema = z.object({
  prompt: z.string().min(1).max(5000),
  options: z.array(z.string().min(1).max(500)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().max(2000).optional().nullable(),
  position: z.number().int().nonnegative().optional(),
});

export const updateQuestionSchema = z.object({
  prompt: z.string().min(1).max(5000).optional(),
  options: z.array(z.string().min(1).max(500)).length(4).optional(),
  correctIndex: z.number().int().min(0).max(3).optional(),
  explanation: z.string().max(2000).optional().nullable(),
  position: z.number().int().nonnegative().optional(),
});

export const startAttemptSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
});

export const submitAnswerSchema = z.object({
  answers: z.array(z.object({
    questionId: uuidSchema,
    selectedIndex: z.number().int().min(0).max(3).nullable(),
  })),
});

export const quizIdParamSchema = z.object({
  id: uuidSchema,
});

export const attemptIdParamSchema = z.object({
  id: uuidSchema,
  attemptId: uuidSchema,
});

export const questionIdParamSchema = z.object({
  id: uuidSchema,
  questionId: uuidSchema,
});

// ============================================================================
// AI Tutor Schemas
// ============================================================================

export const createConversationSchema = z.object({
  title: z.string().max(VALIDATION.TITLE_MAX_LENGTH).trim().optional(),
  noteId: uuidSchema.optional().nullable(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  noteId: uuidSchema.optional().nullable(),
});

export const conversationIdParamSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// Study Session Schemas
// ============================================================================

export const createStudySessionSchema = z.object({
  subjectId: uuidSchema.optional().nullable(),
  startedAt: z.string().datetime().optional(), // ISO string, defaults to now
});

export const updateStudySessionSchema = z.object({
  endedAt: z.string().datetime().optional().nullable(),
  duration: z.number().int().positive().optional(),
  pausedMs: z.number().int().nonnegative().optional(),
  subjectId: uuidSchema.optional().nullable(),
});

export const studySessionIdParamSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// Settings Schemas
// ============================================================================

export const notificationSettingsSchema = z.object({
  studyReminders: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one notification preference must be provided",
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(VALIDATION.NAME_MAX_LENGTH).trim(),
});

// ============================================================================
// Admin Schemas
// ============================================================================

export const auditLogFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  action: z.string().max(50).optional(),
  targetType: z.string().max(50).optional(),
  adminUserId: uuidSchema.optional(),
});

// ============================================================================
// Type Inference Helpers
// ============================================================================

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type SubjectIdParam = z.infer<typeof subjectIdParamSchema>;

export type CreateWrittenNoteInput = z.infer<typeof createWrittenNoteSchema>;
export type CreateFileNoteInput = z.infer<typeof createFileNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteIdParam = z.infer<typeof noteIdParamSchema>;
export type NoteFilters = z.infer<typeof noteFiltersSchema>;

export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
export type AddCardInput = z.infer<typeof addCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type CardProgressInput = z.infer<typeof cardProgressSchema>;
export type DeckIdParam = z.infer<typeof deckIdParamSchema>;
export type CardIdParam = z.infer<typeof cardIdParamSchema>;
export type GenerateDeckInput = z.infer<typeof generateDeckSchema>;
export type DeckFilters = z.infer<typeof deckFiltersSchema>;

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;
export type QuizFilters = z.infer<typeof quizFiltersSchema>;
export type AddQuestionInput = z.infer<typeof addQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type QuizIdParam = z.infer<typeof quizIdParamSchema>;
export type AttemptIdParam = z.infer<typeof attemptIdParamSchema>;
export type QuestionIdParam = z.infer<typeof questionIdParamSchema>;

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;

export type CreateStudySessionInput = z.infer<typeof createStudySessionSchema>;
export type UpdateStudySessionInput = z.infer<typeof updateStudySessionSchema>;
export type StudySessionIdParam = z.infer<typeof studySessionIdParamSchema>;

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;