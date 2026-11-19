import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { flashcardService } from "@/app/lib/services";
import {
  created,
  paginated,
  unauthorized,
  validationError,
  internalError,
  quotaExceeded,
} from "@/app/lib/responses";
import { createDeckSchema, deckFiltersSchema, paginationSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/flashcards — list user's decks with card counts
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 25;
    const sourceNoteId = searchParams.get("sourceNoteId") || undefined;

    const validatedPagination = paginationSchema.safeParse({ page, limit });
    if (!validatedPagination.success) return validationError("Invalid pagination params");

    const validatedFilters = deckFiltersSchema.safeParse({ sourceNoteId });
    if (!validatedFilters.success) return validationError("Invalid filter params");

    const result = await flashcardService.listPaginated(
      user.id,
      validatedPagination.data.page,
      validatedPagination.data.limit,
      validatedFilters.data
    );

    if (!result.success) {
      return internalError(result.error.message);
    }

    return paginated(
      result.data.items,
      result.data.page,
      result.data.limit,
      result.data.total
    );
  } catch (error) {
    console.error("GET /api/flashcards failed:", error);
    return internalError();
  }
}

/**
 * POST /api/flashcards — create a manual deck
 * Body: { title, difficulty?, sourceNoteId?, idempotencyKey? }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = createDeckSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    const result = await flashcardService.create(user.id, {
      ...validated.data,
      userId: user.id,
      difficulty: validated.data.difficulty ?? null,
      sourceNoteId: validated.data.sourceNoteId ?? null,
    });

    if (!result.success) {
      if (result.error.code === "QUOTA_EXCEEDED") {
        return quotaExceeded("decks", result.error.details?.limit as number, result.error.details);
      }
      if (result.error.code === "NOT_FOUND") return validationError("Source note not found");
      return internalError(result.error.message);
    }

    return created(result.data);
  } catch (error) {
    console.error("POST /api/flashcards failed:", error);
    return internalError();
  }
}