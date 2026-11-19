/**
 * Usage limits — all users now have unlimited access.
 *
 * This file is kept for compatibility but no longer enforces restrictions.
 * All limits are effectively infinite.
 */

import { prisma } from "@/app/lib/auth";

/** No limits — all users have unlimited access. */
export const FREE_LIMITS = {
  aiChatMessages: -1,
  flashcardDecks: -1,
  quizzes: -1,
  notesUploaded: -1,
} as const;

export type LimitKey = keyof typeof FREE_LIMITS;

export type UsageCounts = {
  aiChatMessages: number;
  flashcardDecks: number;
  quizzes: number;
  notesUploaded: number;
};

/** Always returns true — Pro check is no longer needed. */
export async function hasProAccess(userId: string): Promise<boolean> {
  return true;
}

/** Get current usage counts (for display only, not enforcement). */
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

/** Always allows — no limits enforced. */
export async function canUseFreeFeature(
  userId: string,
  feature: LimitKey
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  return { allowed: true, remaining: -1, limit: -1 };
}

/** No-op — usage tracking kept for analytics but not enforced. */
export async function incrementUsage(
  userId: string,
  feature: LimitKey
): Promise<void> {
  // Kept for analytics — could be removed entirely if not needed
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

/** Returns unlimited for all features. */
export async function getRemainingUsage(userId: string): Promise<Record<LimitKey, number>> {
  return {
    aiChatMessages: -1,
    flashcardDecks: -1,
    quizzes: -1,
    notesUploaded: -1,
  };
}