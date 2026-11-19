import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { flashcardService } from "@/app/lib/services";
import {
  success,
  unauthorized,
  notFound,
  validationError,
  internalError,
  quotaExceeded,
} from "@/app/lib/responses";
import { generateDeckSchema } from "@/app/lib/validators";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/flashcards/generate — generate cards from an owned note using AI
 * Body: { noteId, title?, count?, difficulty?, idempotencyKey? }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = generateDeckSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    const result = await flashcardService.generateFromNote(user.id, validated.data.noteId, {
      title: validated.data.title ?? undefined,
      count: validated.data.count ?? 10,
      difficulty: validated.data.difficulty,
      idempotencyKey: validated.data.idempotencyKey ?? null,
    });

    if (!result.success) {
      if (result.error.code === "QUOTA_EXCEEDED") {
        return quotaExceeded("decks", result.error.details?.limit as number, result.error.details);
      }
      if (result.error.code === "NOT_FOUND") return notFound("Note");
      if (result.error.code === "UNPROCESSABLE_ENTITY") {
        return Response.json(
          { error: { code: result.error.code, message: result.error.message } },
          { status: 422 }
        );
      }
      if (result.error.code === "CONFLICT") {
        return Response.json(
          { error: { code: result.error.code, message: result.error.message } },
          { status: 409 }
        );
      }
      if (result.error.code === "SERVICE_UNAVAILABLE") {
        return Response.json(
          { error: { code: result.error.code, message: result.error.message } },
          { status: 502 }
        );
      }
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error("POST /api/flashcards/generate failed:", error);
    return internalError();
  }
}