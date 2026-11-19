/**
 * Centralized feature access definitions for ACED.
 *
 * All features are now free for all authenticated users.
 * This file is kept for compatibility but no longer enforces restrictions.
 */

export type FeatureKey =
    | "subjects"
    | "notes"
    | "pdf_uploads"
    | "search"
    | "study_tracking"
    | "dashboard"
    | "ai_tutor"
    | "ai_summaries"
    | "ai_flashcards"
    | "ai_quizzes"
    | "advanced_insights";

/**
 * All features are available to all users.
 */
export const FREE_FEATURES: Set<FeatureKey> = new Set([
    "subjects",
    "notes",
    "pdf_uploads",
    "search",
    "study_tracking",
    "dashboard",
    "ai_tutor",
    "ai_summaries",
    "ai_flashcards",
    "ai_quizzes",
    "advanced_insights",
]);

/**
 * No features require Pro access anymore.
 * @deprecated All features are free.
 */
export const PRO_FEATURES: Set<FeatureKey> = new Set();

/**
 * Check whether a feature requires Pro access.
 * Always returns false since all features are free.
 * @deprecated Always returns false.
 */
export function requiresPro(feature: FeatureKey): boolean {
    return false;
}

/**
 * Check whether a feature is available to free users.
 * Always returns true since all features are free.
 */
export function isFreeFeature(feature: FeatureKey): boolean {
    return FREE_FEATURES.has(feature);
}