import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { quizService } from "@/app/lib/services";
import {
  success,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { attemptIdParamSchema, submitAnswerSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/quizzes/[id]/attempts/[attemptId] — get a specific attempt with answers and questions for review
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { id, attemptId } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = attemptIdParamSchema.safeParse({ id, attemptId });
    if (!validated.success) return validationError("Invalid quiz ID or attempt ID");

    const result = await quizService.getAttempt(user.id, validated.data.id, validated.data.attemptId);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Attempt");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`GET /api/quizzes/${id}/attempts/${attemptId} failed:`, error);
    return internalError();
  }
}

/**
 * PATCH /api/quizzes/[id]/attempts/[attemptId] — submit answers and finish attempt
 * Body: { answers: { questionId: string; selectedIndex: number | null }[] }
 *
 * Server-authoritative: deadline is checked, score is calculated server-side.
 * Once submitted, attempt cannot be modified.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { id, attemptId } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const paramValidated = attemptIdParamSchema.safeParse({ id, attemptId });
    if (!paramValidated.success) return validationError("Invalid quiz ID or attempt ID");

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = submitAnswerSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    const result = await quizService.submitAttempt(
      user.id,
      paramValidated.data.id,
      paramValidated.data.attemptId,
      validated.data.answers
    );

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Attempt");
      if (result.error.code === "CONFLICT") {
        return Response.json(
          { error: { code: result.error.code, message: result.error.message } },
          { status: 409 }
        );
      }
      if (result.error.code === "VALIDATION_ERROR") {
        return validationError(result.error.message);
      }
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`PATCH /api/quizzes/${id}/attempts/${attemptId} failed:`, error);
    return internalError();
  }
}