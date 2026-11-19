import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { flashcardService } from "@/app/lib/services";
import {
  created,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { deckIdParamSchema, addCardSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/flashcards/[id]/cards — add a card to a deck
 * Body: { front, back }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const paramValidated = deckIdParamSchema.safeParse({ id });
    if (!paramValidated.success) return validationError("Invalid deck ID");

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = addCardSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    // Omit position - service computes it automatically
    const { position: _position, ...cardData } = validated.data;
    const result = await flashcardService.addCard(user.id, paramValidated.data.id, cardData);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Deck");
      return internalError(result.error.message);
    }

    return created(result.data);
  } catch (error) {
    console.error(`POST /api/flashcards/${id}/cards failed:`, error);
    return internalError();
  }
}