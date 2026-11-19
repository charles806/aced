import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { validateCardFields } from "@/app/lib/ai/flashcards-prompt";

export const runtime = "nodejs";

async function findOwnDeck(userId: string, deckId: string) {
  return prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
    include: {
      cards: { orderBy: { position: "asc" } },
    },
  });
}

/**
 * POST /api/flashcards/[id]/cards — add a card to a deck.
 * Body: { front, back }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Deck ID is required", 400);
  }

  const deck = await findOwnDeck(user.id, id.trim());
  if (!deck) return jsonError("Deck not found", 404);

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const result = validateCardFields(
    (jsonBody as Record<string, unknown>).front,
    (jsonBody as Record<string, unknown>).back,
  );
  if ("error" in result) return jsonError(result.error, 400);

  const nextPosition = deck.cards.length;

  try {
    const card = await prisma.flashcard.create({
      data: {
        deckId: deck.id,
        front: result.front,
        back: result.back,
        position: nextPosition,
      },
    });

    return Response.json(
      {
        card: {
          id: card.id,
          front: card.front,
          back: card.back,
          position: card.position,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/flashcards/[id]/cards failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
