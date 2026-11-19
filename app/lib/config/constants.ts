/**
 * Application constants.
 * Single source of truth for magic values.
 */

// File upload
export const FILE_UPLOAD = {
  MAX_SIZE_BYTES: 20 * 1024 * 1024, // 20MB
  ALLOWED_MIME_TYPES: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"] as const,
  MAX_FILE_NAME_LENGTH: 255,
} as const;

// Validation limits
export const VALIDATION = {
  NAME_MAX_LENGTH: 100,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5000,
  SUBJECT_NAME_MAX_LENGTH: 100,
  NOTE_CONTENT_MAX_LENGTH: 100_000,
  QUIZ_QUESTION_COUNT_MIN: 3,
  QUIZ_QUESTION_COUNT_MAX: 30,
  QUIZ_TIME_LIMIT_MIN: 1,
  QUIZ_TIME_LIMIT_MAX: 180,
  FLASHCARD_DIFFICULTY_VALUES: ["easy", "medium", "hard", "mixed"] as const,
  QUIZ_DIFFICULTY_VALUES: ["easy", "medium", "hard", "mixed"] as const,
} as const;

// Cache
export const CACHE = {
  DEFAULT_TTL_MS: 30_000, // 30 seconds
  NOTES_TTL_MS: 30_000,
  SEARCH_DEBOUNCE_MS: 300,
} as const;

// API
export const API = {
  REQUEST_TIMEOUT_MS: 60_000,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
} as const;

// Auth
export const AUTH = {
  PASSWORD_MIN_LENGTH: 8,
  RATE_LIMIT_MAX_PER_WINDOW: 3,
  RATE_LIMIT_WINDOW_MS: 600_000, // 10 minutes
} as const;

// Extraction
export const EXTRACTION = {
  SUPPORTED_MIME_TYPES: ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const,
  SIGNED_URL_EXPIRY_SECONDS: 4500, // For extraction fetch
  LIST_SIGNED_URL_EXPIRY_SECONDS: 3600, // For note listing
} as const;

// Study
export const STUDY = {
  DEFAULT_SESSION_DURATION_MINUTES: 25,
  STREAK_WINDOW_HOURS: 24,
} as const;

// AI
export const AI = {
  MAX_TOKENS_TUTOR: 4096,
  MAX_TOKENS_SUMMARY: 2048,
  MAX_TOKENS_FLASHCARDS: 2048,
  MAX_TOKENS_QUIZ: 2048,
} as const;

// Free tier limits (kept for reference, no longer enforced)
export const FREE_TIER_LIMITS = {
  NOTES_UPLOADED: 10,
  FLASHCARD_DECKS: 5,
  QUIZZES: 5,
  AI_CHAT_MESSAGES: 50,
} as const;

// Activity types
export const ACTIVITY_TYPES = [
  "note_created",
  "note_updated",
  "note_deleted",
  "note_opened",
  "subject_created",
  "subject_updated",
  "subject_deleted",
  "quiz_created",
  "quiz_updated",
  "quiz_deleted",
  "quiz_attempt_started",
  "quiz_attempt_submitted",
  "flashcard_deck_created",
  "flashcard_deck_updated",
  "flashcard_deck_deleted",
  "flashcard_studied",
  "study_session_started",
  "study_session_completed",
  "ai_conversation_created",
  "ai_message_sent",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// Export statuses
export const EXTRACTION_STATUS = ["pending", "processing", "completed", "failed"] as const;
export const SUMMARY_STATUS = ["none", "generating", "completed", "failed"] as const;
export const QUIZ_ATTEMPT_STATUS = ["in_progress", "submitted", "expired"] as const;
export const FLASHCARD_PROGRESS_STATUS = ["new", "learning", "review", "known"] as const;

// Subscription statuses (kept for webhook compatibility)
export const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "cancelled",
  "paused",
] as const;

// Admin audit log actions
export const ADMIN_ACTIONS = [
  "create",
  "update",
  "delete",
  "view",
  "login",
  "logout",
  "impersonate",
  "export",
] as const;

// Admin audit log target types
export const ADMIN_TARGET_TYPES = [
  "User",
  "Note",
  "Quiz",
  "FlashcardDeck",
  "Subject",
  "Subscription",
  "Settings",
] as const;