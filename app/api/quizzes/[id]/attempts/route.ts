import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { quizService } from "@/app/lib/services";
import {
  created,
  success,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { quizIdParamSchema, startAttemptSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * POST /api/quizzes/[id]/attempts — start a new quiz attempt (or resume existing)
 * Body: {} (idempotency handled by checking for existing in-progress attempt)
 *
 * Creates an attempt with a server-authoritative deadline based on quiz.timeLimit.
 * If no timeLimit, deadline is far future (untimed).
 * Returns the attempt with the quiz questions (without correctIndex).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = quizIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid quiz ID");

    // Validate empty body (idempotency key is optional for attempts)
    const body = await req.json().catch(() => ({}));
    const validatedBody = startAttemptSchema.safeParse(body);
    if (!validatedBody.success) {
      return validationError("Validation failed", { issues: validatedBody.error.flatten().fieldErrors });
    }

    const result = await quizService.startAttempt(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Quiz");
      if (result.error.code === "FORBIDDEN") return notFound("Quiz");
      return internalError(result.error.message);
    }

    return created(result.data);
  } catch (error) {
    console.error(`POST /api/quizzes/${id}/attempts failed:`, error);
    return internalError();
  }
}

/**
 * GET /api/quizzes/[id]/attempts — list user's attempts for this quiz
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

    const result = await quizService.getAttempts(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Quiz");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`GET /api/quizzes/${id}/attempts failed:`, error);
    return internalError();
  }
}