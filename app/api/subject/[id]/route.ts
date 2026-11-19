import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { subjectService } from "@/app/lib/services";
import {
  success,
  noContent,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { updateSubjectSchema, subjectIdParamSchema } from "@/app/lib/validators";

/**
 * GET /api/subject/[id] — get a single subject
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = subjectIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid subject ID");

    const result = await subjectService.getById(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Subject");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`GET /api/subject/${id} failed:`, error);
    return internalError();
  }
}

/**
 * PATCH /api/subject/[id] — update a subject
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const paramValidated = subjectIdParamSchema.safeParse({ id });
    if (!paramValidated.success) return validationError("Invalid subject ID");

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = updateSubjectSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    const result = await subjectService.update(user.id, id, validated.data);

    if (!result.success) {
      const status = result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN" ? 404 : 500;
      return Response.json(
        { error: { code: result.error.code, message: result.error.message } },
        { status }
      );
    }

    return success(result.data);
  } catch (error) {
    console.error(`PATCH /api/subject/${id} failed:`, error);
    return internalError();
  }
}

/**
 * DELETE /api/subject/[id] — delete a subject
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = subjectIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid subject ID");

    const result = await subjectService.delete(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Subject");
      return internalError(result.error.message);
    }

    return noContent();
  } catch (error) {
    console.error(`DELETE /api/subject/${id} failed:`, error);
    return internalError();
  }
}