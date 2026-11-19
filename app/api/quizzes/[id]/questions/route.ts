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
import { quizIdParamSchema, addQuestionSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/quizzes/[id]/questions — list questions for a quiz
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

    const result = await quizService.getQuestions(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Quiz");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`GET /api/quizzes/${id}/questions failed:`, error);
    return internalError();
  }
}

/**
 * POST /api/quizzes/[id]/questions — add a question to a quiz
 * Body: { prompt, options: string[4], correctIndex: 0-3, explanation? }
 */
export async function POST(
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

    const validated = addQuestionSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    // Omit position - service computes it automatically; convert undefined explanation to null
    const { position: _position, explanation, ...questionData } = validated.data;
    const result = await quizService.addQuestion(user.id, paramValidated.data.id, {
      ...questionData,
      explanation: explanation ?? null,
    });

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Quiz");
      return internalError(result.error.message);
    }

    return created(result.data);
  } catch (error) {
    console.error(`POST /api/quizzes/${id}/questions failed:`, error);
    return internalError();
  }
}