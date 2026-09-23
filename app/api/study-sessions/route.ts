import { jsonError, safeJsonBody, validateSubjectId } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const sessions = await prisma.studySession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return Response.json({ sessions });
  } catch (error) {
    console.error("GET /api/study-sessions failed:", error);
    return jsonError("Something went wrong", 500);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const body = await safeJsonBody(req);

    if (!body) {
      return jsonError(
        "Invalid request body. Expected JSON with an optional subject ID.",
        400
      );
    }

    const subjectId = body.subjectId;

    if (subjectId !== undefined && subjectId !== null) {
      const validated = validateSubjectId(subjectId);

      if ("error" in validated) {
        return jsonError(validated.error, 400);
      }

      const subject = await prisma.subject.findFirst({
        where: {
          id: validated.subjectId,
          userId: user.id,
        },
      });

      if (!subject) {
        return jsonError("Subject not found", 404);
      }
    }

    const session = await prisma.studySession.create({
      data: {
        userId: user.id,
        subjectId: typeof subjectId === "string" ? subjectId : null,
        startedAt: new Date(),
      },
    });

    return Response.json({ session }, { status: 201 });
  } catch (error) {
    console.error("POST /api/study-sessions failed:", error);
    return jsonError("Something went wrong", 500);
  }
}