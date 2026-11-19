/**
 * Free tier usage limits and enforcement.
 *
 * Free tier limits:
 * - 20 AI chat messages total
 * - 1 flashcard deck generation
 * - 1 quiz generation
 * - 3 notes uploaded
 */

import { prisma } from "@/app/lib/auth";

/** Free tier limits — change these values to adjust limits. */
export const FREE_LIMITS = {
  aiChatMessages: 20,
  flashcardDecks: 1,
  quizzes: 1,
  notesUploaded: 3,
} as const;

export type LimitKey = keyof typeof FREE_LIMITS;

export type UsageCounts = {
  aiChatMessages: number;
  flashcardDecks: number;
  quizzes: number;
  notesUploaded: number;
};

/** Check if a user has Pro access (re-export for convenience). */
export async function hasProAccess(userId: string): Promise<boolean> {
  const { hasProAccess: checkPro } = await import("./entitlement");
  return checkPro(userId);
}

/** Get current usage counts for a free user. */
export async function getUsage(userId: string): Promise<UsageCounts> {
  const usage = await prisma.freeUserUsage.findUnique({
    where: { userId },
    select: {
      aiChatMessages: true,
      flashcardDecks: true,
      quizzes: true,
      notesUploaded: true,
    },
  });

  if (!usage) {
    return {
      aiChatMessages: 0,
      flashcardDecks: 0,
      quizzes: 0,
      notesUploaded: 0,
    };
  }

  return usage;
}

/** Check if a free user can perform an action (hasn't hit the limit). */
export async function canUseFreeFeature(
  userId: string,
  feature: LimitKey
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const isPro = await hasProAccess(userId);
  if (isPro) {
    return { allowed: true, remaining: -1, limit: -1 }; // -1 = unlimited
  }

  const usage = await getUsage(userId);
  const limit = FREE_LIMITS[feature];
  const current = usage[feature];
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current < limit,
    remaining,
    limit,
  };
}

/** Increment usage count for a free user after a successful action. */
export async function incrementUsage(
  userId: string,
  feature: LimitKey
): Promise<void> {
  const isPro = await hasProAccess(userId);
  if (isPro) return; // Pro users don't count against limits

  await prisma.freeUserUsage.upsert({
    where: { userId },
    update: {
      [feature]: { increment: 1 },
    },
    create: {
      userId,
      [feature]: 1,
    },
  });
}

/** Get remaining usage for display in UI. */
export async function getRemainingUsage(userId: string): Promise<Record<LimitKey, number>> {
  const isPro = await hasProAccess(userId);
  if (isPro) {
    return {
      aiChatMessages: -1,
      flashcardDecks: -1,
      quizzes: -1,
      notesUploaded: -1,
    };
  }

  const usage = await getUsage(userId);
  return {
    aiChatMessages: Math.max(0, FREE_LIMITS.aiChatMessages - usage.aiChatMessages),
    flashcardDecks: Math.max(0, FREE_LIMITS.flashcardDecks - usage.flashcardDecks),
    quizzes: Math.max(0, FREE_LIMITS.quizzes - usage.quizzes),
    notesUploaded: Math.max(0, FREE_LIMITS.notesUploaded - usage.notesUploaded),
  };
}