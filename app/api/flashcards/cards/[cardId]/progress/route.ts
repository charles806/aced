import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";

export const runtime = "nodejs";

type ProgressStatus = "know" | "review";

function isProgressStatus(value: unknown): value is ProgressStatus {
  return value === "know" || value === "review";
}

/**
 * POST /api/flashcards/cards/[cardId]/progress — mark a card as "know" or
 * "review". Persists per (user, card) so study progress survives reloads.
 * Body: { status: "know" | "review" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { cardId } = await params;
  if (typeof cardId !== "string" || cardId.trim() === "") {
    return jsonError("Card ID is required", 400);
  }

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const status = (jsonBody as Record<string, unknown>).status;
  if (!isProgressStatus(status)) {
    return jsonError('Status must be "know" or "review"', 400);
  }

  // Verify the card belongs to a deck owned by this user.
  const card = await prisma.flashcard.findFirst({
    where: { id: cardId.trim() },
    include: { deck: { select: { id: true, userId: true, title: true } } },
  });

  if (!card || card.deck.userId !== user.id) {
    return jsonError("Card not found", 404);
  }

  try {
    const progress = await prisma.flashcardProgress.upsert({
      where: { userId_cardId: { userId: user.id, cardId: card.id } },
      update: { status, updatedAt: new Date() },
      create: {
        userId: user.id,
        deckId: card.deck.id,
        cardId: card.id,
        status,
      },
    });

    return Response.json({
      progress: {
        cardId: progress.cardId,
        status: progress.status,
        updatedAt: progress.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/flashcards/cards/[cardId]/progress failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
