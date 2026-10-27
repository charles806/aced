import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import { validateDeckTitle } from "@/app/lib/ai/flashcards-prompt";
import { createActivity } from "@/app/lib/activity";

export const runtime = "nodejs";

function deckPayload(deck: {
  id: string;
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  _count?: { cards: number };
  cards?: Array<{ id: string; front: string; back: string; position: number }>;
  progress?: Array<{ cardId: string; status: string }>;
}) {
  return {
    id: deck.id,
    title: deck.title,
    difficulty: deck.difficulty ?? null,
    sourceNoteId: deck.sourceNoteId ?? null,
    cardCount: deck._count?.cards ?? (deck.cards?.length ?? 0),
    cards: deck.cards?.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      position: c.position,
    })) ?? null,
    progress: deck.progress?.map((p) => ({
      cardId: p.cardId,
      status: p.status,
    })) ?? null,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

/**
 * Shared: find a deck owned by the user. Always scoped so cross-user IDs 404.
 */
async function findOwnDeck(userId: string, deckId: string) {
  return prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
    include: {
      _count: { select: { cards: true } },
      cards: { orderBy: { position: "asc" } },
    },
  });
}

/**
 * GET /api/flashcards/[id] — get one deck with its cards.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Deck ID is required", 400);
  }

  let deck;
  try {
    deck = await prisma.flashcardDeck.findFirst({
      where: { id: id.trim(), userId: user.id },
      include: {
        _count: { select: { cards: true } },
        cards: { orderBy: { position: "asc" } },
        progress: { select: { cardId: true, status: true } },
      },
    });
  } catch (error) {
    console.error("GET /api/flashcards/[id] failed:", error);
    return jsonError("Something went wrong", 500);
  }

  if (!deck) return jsonError("Deck not found", 404);

  return Response.json({ deck: deckPayload(deck) });
}

/**
 * PATCH /api/flashcards/[id] — rename a deck (and optionally difficulty).
 * Body: { title?, difficulty? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const { id } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Deck ID is required", 400);
  }

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  let deck;

  try {
    deck = await prisma.flashcardDeck.findFirst({
      where: { id: id.trim(), userId: user.id },
    });
  } catch (error) {
    console.error("PATCH /api/flashcards/[id] deck lookup failed:", error);
    return jsonError("Something went wrong", 500);
  }

  if (!deck) return jsonError("Deck not found", 404);

  const data: Record<string, unknown> = {};

  const titleRaw = (jsonBody as Record<string, unknown>).title;
  if (titleRaw !== undefined && titleRaw !== null) {
    const result = validateDeckTitle(titleRaw);
    if ("error" in result) return jsonError(result.error, 400);
    data.title = result.title;
  }

  const difficultyRaw = (jsonBody as Record<string, unknown>).difficulty;
  if (difficultyRaw !== undefined && difficultyRaw !== null) {
    if (
      difficultyRaw !== "easy" &&
      difficultyRaw !== "medium" &&
      difficultyRaw !== "hard" &&
      difficultyRaw !== "mixed"
    ) {
      return jsonError('Difficulty must be "easy", "medium", "hard", or "mixed"', 400);
    }
    data.difficulty = difficultyRaw;
  }

  if (Object.keys(data).length === 0) {
    return jsonError("Nothing to update", 400);
  }

  try {
    const updated = await prisma.flashcardDeck.update({
      where: { id: deck.id },
      data,
      include: { _count: { select: { cards: true } } },
    });
    return Response.json({ deck: deckPayload(updated) });
  } catch (error) {
    console.error("PATCH /api/flashcards/[id] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}

/**
 * DELETE /api/flashcards/[id] — delete a deck and all its cards/progress.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const { id } = await params;
  if (typeof id !== "string" || id.trim() === "") {
    return jsonError("Deck ID is required", 400);
  }

  const deck = await findOwnDeck(user.id, id.trim());
  if (!deck) return jsonError("Deck not found", 404);

  try {
    await prisma.$transaction([
      prisma.flashcardProgress.deleteMany({ where: { deckId: deck.id } }),
      prisma.flashcard.deleteMany({ where: { deckId: deck.id } }),
      prisma.flashcardDeck.delete({ where: { id: deck.id } }),
    ]);

    void createActivity({
      userId: user.id,
      type: "flashcard_deck_deleted",
      label: `Deleted deck "${deck.title}"`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/flashcards/[id] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
