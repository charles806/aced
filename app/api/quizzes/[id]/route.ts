import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { quizService } from "@/app/lib/services";
import {
  success,
  noContent,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { updateQuizSchema, quizIdParamSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/quizzes/[id] — get a single quiz with questions
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = quizIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid quiz ID");

    const result = await quizService.getDetailById(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Quiz");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`GET /api/quizzes/${id} failed:`, error);
    return internalError();
  }
}

/**
 * PATCH /api/quizzes/[id] — update quiz metadata (title, difficulty, timeLimit, questionCount)
 * Body: { title?, difficulty?, timeLimit?, questionCount? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const paramValidated = quizIdParamSchema.safeParse({ id });
    if (!paramValidated.success) return validationError("Invalid quiz ID");

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = updateQuizSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    const result = await quizService.update(user.id, id, validated.data);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Quiz");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`PATCH /api/quizzes/${id} failed:`, error);
    return internalError();
  }
}

/**
 * DELETE /api/quizzes/[id] — delete a quiz and its questions/attempts
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = quizIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid quiz ID");

    const result = await quizService.delete(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Quiz");
      return internalError(result.error.message);
    }

    return noContent();
  } catch (error) {
    console.error(`DELETE /api/quizzes/${id} failed:`, error);
    return internalError();
  }
}