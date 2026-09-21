import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import {
    jsonError,
    safeJsonBody,
    validateSubjectName,
} from "@/app/lib/api";

export async function GET(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    try {
        const subjects = await prisma.subject.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return Response.json({ subjects });
    } catch (error) {
        console.error("GET /api/subject failed:", error);
        return jsonError("Something went wrong", 500);
    }
}

export async function POST(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const body = await safeJsonBody(req);

    if (!body) {
        return jsonError(
            "Invalid request body. Expected JSON with a subject name.",
            400
        );
    }

    const validated = validateSubjectName(body.name);

    if ("error" in validated) {
        return jsonError(validated.error, 400);
    }

    try {
        const subject = await prisma.subject.create({
            data: {
                name: validated.name,
                userId: user.id,
            },
        });

        return Response.json({ subject }, { status: 201 });
    } catch (error) {
        console.error("POST /api/subject failed:", error);
        return jsonError("Something went wrong", 500);
    }
}
