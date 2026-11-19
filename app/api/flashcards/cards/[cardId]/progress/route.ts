import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { flashcardService } from "@/app/lib/services";
import {
  success,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { cardProgressSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/flashcards/cards/[cardId]/progress — mark a card as "know" or "review"
 * Persists per (user, card) so study progress survives reloads.
 * Body: { status: "know" | "review" }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = cardProgressSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    // We need to find the deck for this card first
    // The flashcard service needs deckId - we'll need to fetch it
    const { prisma } = await import("@/app/lib/auth");

    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
      select: { deckId: true },
    });

    if (!card) {
      return notFound("Card");
    }

    const result = await flashcardService.updateProgress(
      user.id,
      card.deckId,
      cardId,
      validated.data.status
    );

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Card");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`POST /api/flashcards/cards/${cardId}/progress failed:`, error);
    return internalError();
  }
}