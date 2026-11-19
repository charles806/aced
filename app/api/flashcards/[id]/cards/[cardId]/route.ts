import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { flashcardService } from "@/app/lib/services";
import {
  success,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { cardIdParamSchema, updateCardSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * PATCH /api/flashcards/[id]/cards/[cardId] — edit a card
 * Body: { front?, back? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const paramValidated = cardIdParamSchema.safeParse({ id, cardId });
    if (!paramValidated.success) return validationError("Invalid deck ID or card ID");

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = updateCardSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    if (Object.keys(validated.data).length === 0) {
      return validationError("Nothing to update");
    }

    const result = await flashcardService.updateCard(user.id, paramValidated.data.id, paramValidated.data.cardId, validated.data);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Card");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`PATCH /api/flashcards/${id}/cards/${cardId} failed:`, error);
    return internalError();
  }
}

/**
 * DELETE /api/flashcards/[id]/cards/[cardId] — delete a card
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const paramValidated = cardIdParamSchema.safeParse({ id, cardId });
    if (!paramValidated.success) return validationError("Invalid deck ID or card ID");

    const result = await flashcardService.deleteCard(user.id, paramValidated.data.id, paramValidated.data.cardId);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Card");
      return internalError(result.error.message);
    }

    return success({ deleted: true });
  } catch (error) {
    console.error(`DELETE /api/flashcards/${id}/cards/${cardId} failed:`, error);
    return internalError();
  }
}