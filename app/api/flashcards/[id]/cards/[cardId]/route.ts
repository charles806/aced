import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { validateCardFields } from "@/app/lib/ai/flashcards-prompt";

export const runtime = "nodejs";

async function findOwnDeck(userId: string, deckId: string) {
  return prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
  });
}

async function findOwnCard(userId: string, deckId: string, cardId: string) {
  const deck = await findOwnDeck(userId, deckId);
  if (!deck) return null;
  return prisma.flashcard.findFirst({
    where: { id: cardId, deckId },
  });
}

/**
 * PATCH /api/flashcards/[id]/cards/[cardId] — edit a card.
 * Body: { front?, back? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id, cardId } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Deck ID is required", 400);
  }
  if (typeof cardId !== "string" || cardId.trim() === "") {
    return jsonError("Card ID is required", 400);
  }

  const card = await findOwnCard(user.id, id.trim(), cardId.trim());
  if (!card) return jsonError("Card not found", 404);

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const frontRaw = (jsonBody as Record<string, unknown>).front;
  const backRaw = (jsonBody as Record<string, unknown>).back;
  const result = validateCardFields(frontRaw, backRaw);
  if ("error" in result) return jsonError(result.error, 400);

  try {
    const updated = await prisma.flashcard.update({
      where: { id: card.id },
      data: { front: result.front, back: result.back },
    });
    return Response.json({
      card: {
        id: updated.id,
        front: updated.front,
        back: updated.back,
        position: updated.position,
      },
    });
  } catch (error) {
    console.error("PATCH /api/flashcards/[id]/cards/[cardId] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}

/**
 * DELETE /api/flashcards/[id]/cards/[cardId] — delete a card.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id, cardId } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Deck ID is required", 400);
  }
  if (typeof cardId !== "string" || cardId.trim() === "") {
    return jsonError("Card ID is required", 400);
  }

  const card = await findOwnCard(user.id, id.trim(), cardId.trim());
  if (!card) return jsonError("Card not found", 404);

  try {
    await prisma.flashcardProgress.deleteMany({ where: { cardId: card.id } });
    await prisma.flashcard.delete({ where: { id: card.id } });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/flashcards/[id]/cards/[cardId] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
