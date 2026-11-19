import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { subjectService } from "@/app/lib/services";
import {
  created,
  paginated,
  unauthorized,
  validationError,
  internalError,
} from "@/app/lib/responses";
import { createSubjectSchema, paginationSchema } from "@/app/lib/validators";

/**
 * GET /api/subject — list user's subjects with counts
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 25;

    const validated = paginationSchema.safeParse({ page, limit });
    if (!validated.success) return validationError("Invalid pagination params");

    const result = await subjectService.listPaginated(user.id, validated.data.page, validated.data.limit);

    if (!result.success) {
      return validationError(result.error.message);
    }

    return paginated(
      result.data.items,
      result.data.page,
      result.data.limit,
      result.data.total
    );
  } catch (error) {
    console.error("GET /api/subject failed:", error);
    return internalError();
  }
}

/**
 * POST /api/subject — create a new subject
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return validationError("Invalid request body. Expected JSON.");

    const validated = createSubjectSchema.safeParse(body);
    if (!validated.success) {
      return validationError("Validation failed", { issues: validated.error.flatten().fieldErrors });
    }

    const result = await subjectService.create(user.id, validated.data);

    if (!result.success) {
      const status = result.error.code === "DATABASE_ERROR" ? 500 : 400;
      return Response.json(
        { error: { code: result.error.code, message: result.error.message } },
        { status }
      );
    }

    return created(result.data);
  } catch (error) {
    console.error("POST /api/subject failed:", error);
    return internalError();
  }
}