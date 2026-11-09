import { NextResponse } from "next/server";
import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";
import { canUseFreeFeature, incrementUsage } from "@/app/lib/billing/limits";
import { generateText } from "@/app/lib/ai/ai";
import {
  buildFlashcardsInput,
  parseCardCount,
  parseDifficulty,
  parseFlashcardsOutput,
  resolveFlashcardSourceText,
  validateDeckTitle,
  validateIdempotencyKey,
} from "@/app/lib/ai/flashcards-prompt";
import { createActivity } from "@/app/lib/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL_UNAVAILABLE_MESSAGE =
  "Flashcards unavailable right now. Please try again.";

const NOT_READY_MESSAGE =
  "This note isn't ready for flashcards yet. Wait for text extraction to finish, then try again.";

const UNREADABLE_MESSAGE =
  "We couldn't read this note. Try re-uploading it as a clearer PDF or image.";

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
 * POST /api/flashcards/generate — generate cards from an owned note using AI.
 * Body: { noteId, title?, count?, difficulty?, idempotencyKey? }
 */
export async function POST(req: Request) {
  // 1. Authenticate.
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  // 2. Check access: Pro users have unlimited access, free users have limited access.
  const proAccess = await requireProAccess(user.id);
  const isPro = proAccess.ok;

  if (!isPro) {
    // Check free tier limit for flashcard generation
    const flashcardLimit = await canUseFreeFeature(user.id, "flashcardDecks");
    if (!flashcardLimit.allowed) {
      return jsonError(
        `Free tier limit reached: you can generate up to ${flashcardLimit.limit} flashcard deck. Upgrade to Pro for unlimited generations.`,
        403
      );
    }
  }

  // 3. Validate body.
  const jsonBody = await safeJsonBody(req);
  if (!jsonBody) {
    return jsonError("Invalid request body. Expected JSON.", 400);
  }

  const noteIdRaw = (jsonBody as Record<string, unknown>).noteId;
  if (typeof noteIdRaw !== "string" || noteIdRaw.trim() === "") {
    return jsonError("Note ID is required", 400);
  }
  const noteId = noteIdRaw.trim();

  const count = parseCardCount((jsonBody as Record<string, unknown>).count);
  if (!count) {
    return jsonError(`Count must be an integer between 3 and 30`, 400);
  }

  const difficulty = parseDifficulty(
    (jsonBody as Record<string, unknown>).difficulty,
  );
  if (!difficulty) {
    return jsonError('Difficulty must be "easy", "medium", "hard", or "mixed"', 400);
  }

  const titleRaw = (jsonBody as Record<string, unknown>).title;
  let deckTitle: string;
  if (titleRaw !== undefined && titleRaw !== null) {
    const result = validateDeckTitle(titleRaw);
    if ("error" in result) return jsonError(result.error, 400);
    deckTitle = result.title;
  } else {
    deckTitle = undefined as unknown as string; // filled after note lookup
  }

  const idempotencyResult = validateIdempotencyKey(
    (jsonBody as Record<string, unknown>).idempotencyKey,
  );
  if ("error" in idempotencyResult) return jsonError(idempotencyResult.error, 400);
  const idempotencyKey = idempotencyResult.key;

  if (idempotencyKey) {
    const existing = await prisma.flashcardDeck.findFirst({
      where: { userId: user.id, idempotencyKey },
      include: { _count: { select: { cards: true } } },
    });
    if (existing) return NextResponse.json({ deck: deckPayload(existing) });
  }

  // 4. Find the note — always scoped to the authenticated user.
  let note;
  try {
    note = await prisma.note.findFirst({
      where: { id: noteId, userId: user.id },
    });
  } catch (error) {
    console.error("POST /api/flashcards/generate note lookup failed:", error);
    return jsonError("Something went wrong", 500);
  }

  if (!note) return jsonError("Note not found", 404);

  if (!deckTitle) deckTitle = note.title;

  // 5. Readiness — same rule as summaries and the tutor.
  const noteText = resolveFlashcardSourceText({
    content: note.content,
    extractedText: note.extractedText,
    fileUrl: note.fileUrl,
    fileName: note.fileName,
    fileType: note.fileType,
  });

  if (!noteText) {
    if (note.extractionStatus === "failed") {
      return jsonError(UNREADABLE_MESSAGE, 422);
    }
    return jsonError(NOT_READY_MESSAGE, 409);
  }

  // 6. Generate. Provider errors are logged server-side and surfaced as one
  //    generic 502 — never leaked to the client.
  let raw: string;
  try {
    raw = await generateText(
      buildFlashcardsInput(note.title, noteText, count, difficulty),
      { feature: "flashcards" },
    );
  } catch (error) {
    console.error("POST /api/flashcards/generate model call failed:", error);
    return jsonError(MODEL_UNAVAILABLE_MESSAGE, 502);
  }

  // 7. Validate and normalize — never trust AI output as structured data.
  const cards = parseFlashcardsOutput(raw, count);
  if (!cards) {
    return jsonError(MODEL_UNAVAILABLE_MESSAGE, 502);
  }

  // 8. Persist in a transaction so we never save a deck without its cards.
  try {
    const created = await prisma.$transaction(async (tx) => {
      const deck = await tx.flashcardDeck.create({
        data: {
          title: deckTitle,
          difficulty,
          sourceNoteId: noteId,
          userId: user.id,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });

      await tx.flashcard.createMany({
        data: cards.map((card, index) => ({
          deckId: deck.id,
          front: card.front,
          back: card.back,
          position: index,
        })),
      });

      return { deck, cardCount: cards.length };
    });

    if (!isPro) {
      await incrementUsage(user.id, "flashcardDecks");
    }

    void createActivity({
      userId: user.id,
      type: "flashcard_deck_created",
      noteId,
      label: `Generated deck "${created.deck.title}" from "${note.title}"`,
    });

    return NextResponse.json({
      deck: deckPayload({
        ...created.deck,
        _count: { cards: created.cardCount },
      }),
    });
  } catch (error) {
    console.error("POST /api/flashcards/generate persist failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
