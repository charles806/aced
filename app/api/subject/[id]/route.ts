import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import {
    jsonError,
    safeJsonBody,
    validateSubjectName,
} from "@/app/lib/api";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const { id } = await params;

    try {
        const subject = await prisma.subject.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!subject) {
            return jsonError("Subject not found", 404);
        }

        return Response.json({ subject });
    } catch (error) {
        console.error(`GET /api/subject/${id} failed:`, error);
        return jsonError("Something went wrong", 500);
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const { id } = await params;

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
        const find = await prisma.subject.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!find) {
            return jsonError("Subject not found", 404);
        }

        const subject = await prisma.subject.update({
            where: {
                id,
            },
            data: {
                name: validated.name,
            },
        });

        return Response.json({ subject });
    } catch (error) {
        console.error(`PATCH /api/subject/${id} failed:`, error);
        return jsonError("Something went wrong", 500);
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const { id } = await params;

    try {
        const find = await prisma.subject.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!find) {
            return jsonError("Subject not found", 404);
        }

        await prisma.subject.delete({
            where: {
                id,
            },
        });

        return Response.json({ message: "Subject deleted successfully" });
    } catch (error) {
        console.error(`DELETE /api/subject/${id} failed:`, error);
        return jsonError("Something went wrong", 500);
    }
}
