/**
 * Centralized feature access definitions for ACED Free vs Pro tiers.
 *
 * This is the single source of truth for which features require a Pro
 * subscription. Future AI routes and premium components should import
 * from here rather than scattering hardcoded checks.
 *
 * Usage in API routes:
 *   import { requiresPro } from "@/app/lib/billing/features";
 *   if (requiresPro("ai_tutor")) { /* guard with hasProAccess *\/ }
 *
 * Usage in frontend:
 *   import { FREE_FEATURES, PRO_FEATURES } from "@/app/lib/billing/features";
 *   const canUse = isPro ? PRO_FEATURES.has(feature) : FREE_FEATURES.has(feature);
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
 * Features available to all users (Free tier).
 */
export const FREE_FEATURES: Set<FeatureKey> = new Set([
    "subjects",
    "notes",
    "pdf_uploads",
    "search",
    "study_tracking",
    "dashboard",
]);

/**
 * Features that require an active Pro subscription.
 * Pro users also have access to everything in FREE_FEATURES.
 */
export const PRO_FEATURES: Set<FeatureKey> = new Set([
    "ai_tutor",
    "ai_summaries",
    "ai_flashcards",
    "ai_quizzes",
    "advanced_insights",
]);

/**
 * Check whether a feature requires Pro access.
 * Returns `true` for Pro-only features, `false` for free features.
 */
export function requiresPro(feature: FeatureKey): boolean {
    return PRO_FEATURES.has(feature);
}

/**
 * Check whether a feature is available to free users.
 */
export function isFreeFeature(feature: FeatureKey): boolean {
    return FREE_FEATURES.has(feature);
}
