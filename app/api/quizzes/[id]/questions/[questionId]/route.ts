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
import { questionIdParamSchema, updateQuestionSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * PATCH /api/quizzes/[id]/questions/[questionId] — edit a question
 * Body: { prompt?, options?, correctIndex?, explanation? }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id, questionId } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = questionIdParamSchema.safeParse({ id, questionId });
    if (!validated.success) return validationError("Invalid quiz ID or question ID");

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validatedBody = updateQuestionSchema.safeParse(body);
    if (!validatedBody.success) {
      return validationError("Validation failed", { issues: validatedBody.error.flatten().fieldErrors });
    }

    const result = await quizService.updateQuestion(
      user.id,
      validated.data.id,
      validated.data.questionId,
      validatedBody.data
    );

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Question");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`PATCH /api/quizzes/${id}/questions/${questionId} failed:`, error);
    return internalError();
  }
}

/**
 * DELETE /api/quizzes/[id]/questions/[questionId] — delete a question
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id, questionId } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = questionIdParamSchema.safeParse({ id, questionId });
    if (!validated.success) return validationError("Invalid quiz ID or question ID");

    const result = await quizService.deleteQuestion(user.id, validated.data.id, validated.data.questionId);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Question");
      return internalError(result.error.message);
    }

    return noContent();
  } catch (error) {
    console.error(`DELETE /api/quizzes/${id}/questions/${questionId} failed:`, error);
    return internalError();
  }
}