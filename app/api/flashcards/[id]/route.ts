import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { flashcardService } from "@/app/lib/services";
import {
  success,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { deckIdParamSchema, updateDeckSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/flashcards/[id] — get one deck with its cards and progress
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = deckIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid deck ID");

    const result = await flashcardService.getDetailById(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Deck");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`GET /api/flashcards/${id} failed:`, error);
    return internalError();
  }
}

/**
 * PATCH /api/flashcards/[id] — rename a deck (and optionally difficulty)
 * Body: { title?, difficulty? }
 */
export async function PATCH(
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

    const validated = updateDeckSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    if (Object.keys(validated.data).length === 0) {
      return validationError("Nothing to update");
    }

    const result = await flashcardService.update(user.id, paramValidated.data.id, validated.data);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Deck");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`PATCH /api/flashcards/${id} failed:`, error);
    return internalError();
  }
}

/**
 * DELETE /api/flashcards/[id] — delete a deck and all its cards/progress
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = deckIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid deck ID");

    const result = await flashcardService.delete(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Deck");
      return internalError(result.error.message);
    }

    return success({ deleted: true });
  } catch (error) {
    console.error(`DELETE /api/flashcards/${id} failed:`, error);
    return internalError();
  }
}