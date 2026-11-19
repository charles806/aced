import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { noteService } from "@/app/lib/services";
import {
  success,
  noContent,
  unauthorized,
  notFound,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { updateNoteSchema, noteIdParamSchema, reextractNoteSchema } from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/notes/[id] — get a single note
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = noteIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid note ID");

    const result = await noteService.getById(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Note");
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`GET /api/notes/${id} failed:`, error);
    return internalError();
  }
}

/**
 * PATCH /api/notes/[id] — update a note
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const paramValidated = noteIdParamSchema.safeParse({ id });
    if (!paramValidated.success) return validationError("Invalid note ID");

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = updateNoteSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    const result = await noteService.update(user.id, id, validated.data);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND" || result.error.code === "FORBIDDEN") return notFound("Note");
      if (result.error.code === "VALIDATION_ERROR") return validationError(result.error.message);
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`PATCH /api/notes/${id} failed:`, error);
    return internalError();
  }
}

/**
 * DELETE /api/notes/[id] — delete a note
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = noteIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid note ID");

    const result = await noteService.delete(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Note");
      return internalError(result.error.message);
    }

    return noContent();
  } catch (error) {
    console.error(`DELETE /api/notes/${id} failed:`, error);
    return internalError();
  }
}

/**
 * POST /api/notes/[id]/reextract — re-extract note content
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const validated = noteIdParamSchema.safeParse({ id });
    if (!validated.success) return validationError("Invalid note ID");

    // Validate empty body for re-extraction
    const bodyValidated = reextractNoteSchema.safeParse({});
    if (!bodyValidated.success) return validationError("Invalid request");

    const result = await noteService.reextract(user.id, validated.data.id);

    if (!result.success) {
      if (result.error.code === "NOT_FOUND") return notFound("Note");
      if (result.error.code === "VALIDATION_ERROR") return validationError(result.error.message);
      return internalError(result.error.message);
    }

    return success(result.data);
  } catch (error) {
    console.error(`POST /api/notes/${id}/reextract failed:`, error);
    return internalError();
  }
}