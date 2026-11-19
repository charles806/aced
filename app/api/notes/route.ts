import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { noteService } from "@/app/lib/services";
import {
  created,
  paginated,
  unauthorized,
  validationError,
  internalError,
  quotaExceeded,
} from "@/app/lib/responses";
import {
  createWrittenNoteSchema,
  createFileNoteSchema,
  noteFiltersSchema,
  paginationSchema,
} from "@/app/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/notes — list user's notes with filters
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 25;
    const subjectId = searchParams.get("subjectId") || undefined;
    const search = searchParams.get("search") || undefined;
    const fileType = searchParams.get("fileType") || undefined;

    const validatedPagination = paginationSchema.safeParse({ page, limit });
    if (!validatedPagination.success) return validationError("Invalid pagination params");

    const validatedFilters = noteFiltersSchema.safeParse({ subjectId, search, fileType });
    if (!validatedFilters.success) return validationError("Invalid filter params");

    const result = await noteService.listPaginated(
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
    console.error("GET /api/notes failed:", error);
    return internalError();
  }
}

/**
 * POST /api/notes — create a new note (written or file)
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const contentType = req.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    if (isMultipart) {
      // File note upload
      const formData = await req.formData();

      const title = formData.get("title");
      const subjectId = formData.get("subjectId");
      const file = formData.get("file");

      // Validate using Zod schema for file notes
      const body = {
        title: title as string,
        subjectId: subjectId as string,
        fileName: file instanceof File ? file.name : "",
        fileType: file instanceof File ? file.type : "",
        fileUrl: "", // Will be set after upload
      };

      const validated = createFileNoteSchema.safeParse(body);
      if (!validated.success) {
        return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
      }

      if (!(file instanceof File)) {
        return validationError("File is required for file notes");
      }

      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Create file note via service
      const result = await noteService.createFileNote(user.id, {
        title: validated.data.title,
        subjectId: validated.data.subjectId,
        userId: user.id,
        fileBuffer: buffer,
        fileName: validated.data.fileName,
        fileType: validated.data.fileType,
      });

      if (!result.success) {
        if (result.error.code === "QUOTA_EXCEEDED") {
          return quotaExceeded("notes", result.error.details?.limit as number, result.error.details);
        }
        if (result.error.code === "VALIDATION_ERROR") {
          return validationError(result.error.message);
        }
        return internalError(result.error.message);
      }

      return created(result.data);
    } else {
      // Written note (JSON body)
      const body = await req.json().catch(() => null);
      if (!body) return validationError("Invalid request body. Expected JSON.");

      const validated = createWrittenNoteSchema.safeParse(body);
      if (!validated.success) {
        return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
      }

      const result = await noteService.createWrittenNote(user.id, {
        ...validated.data,
        userId: user.id,
      });

      if (!result.success) {
        if (result.error.code === "QUOTA_EXCEEDED") {
          return quotaExceeded("notes", result.error.details?.limit as number, result.error.details);
        }
        return internalError(result.error.message);
      }

      return created(result.data);
    }
  } catch (error) {
    console.error("POST /api/notes failed:", error);
    return internalError();
  }
}