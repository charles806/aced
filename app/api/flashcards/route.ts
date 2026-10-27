import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import {
  parseDifficulty,
  validateDeckTitle,
  validateIdempotencyKey,
} from "@/app/lib/ai/flashcards-prompt";
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
}) {
  return {
    id: deck.id,
    title: deck.title,
    difficulty: deck.difficulty ?? null,
    sourceNoteId: deck.sourceNoteId ?? null,
    cardCount: deck._count?.cards ?? 0,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

/**
 * GET /api/flashcards — list the user's decks with card counts.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const decks = await prisma.flashcardDeck.findMany({
    where: { userId: user.id },
    include: { _count: { select: { cards: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({ decks: decks.map(deckPayload) });
}

/**
 * POST /api/flashcards — create a manual deck.
 * Body: { title, difficulty?, sourceNoteId? }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const titleResult = validateDeckTitle(
    (jsonBody as Record<string, unknown>).title,
  );
  if ("error" in titleResult) return jsonError(titleResult.error, 400);

  const difficultyResult = parseDifficulty(
    (jsonBody as Record<string, unknown>).difficulty,
  );
  if (!difficultyResult) {
    return jsonError('Difficulty must be "easy", "medium", "hard", or "mixed"', 400);
  }

  const sourceNoteIdRaw = (jsonBody as Record<string, unknown>).sourceNoteId;
  let sourceNoteId: string | null = null;
  if (sourceNoteIdRaw !== undefined && sourceNoteIdRaw !== null) {
    if (typeof sourceNoteIdRaw !== "string" || sourceNoteIdRaw.trim() === "") {
      return jsonError("Source note ID must be a non-empty string", 400);
    }
    sourceNoteId = sourceNoteIdRaw.trim();

    const note = await prisma.note.findFirst({
      where: { id: sourceNoteId, userId: user.id },
    });
    if (!note) return jsonError("Source note not found", 404);
  }

  const idempotencyResult = validateIdempotencyKey(
    (jsonBody as Record<string, unknown>).idempotencyKey,
  );
  if ("error" in idempotencyResult) return jsonError(idempotencyResult.error, 400);
  const idempotencyKey = idempotencyResult.key;

  if (idempotencyKey) {
    const existing = await prisma.flashcardDeck.findFirst({
      where: { userId: user.id, idempotencyKey },
    });
    if (existing) return Response.json(deckPayload(existing));
  }

  try {
    const deck = await prisma.flashcardDeck.create({
      data: {
        title: titleResult.title,
        difficulty: difficultyResult,
        sourceNoteId,
        userId: user.id,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    void createActivity({
      userId: user.id,
      type: "flashcard_deck_created",
      label: `Created deck "${deck.title}"`,
    });

    return Response.json({ deck: deckPayload(deck) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/flashcards failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
