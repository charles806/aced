import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { getSignedFileUrl, storage } from "@/app/lib/storage";

export const runtime = "nodejs";

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
        const note = await prisma.note.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!note) {
            return jsonError("Note not found", 404);
        }

        return Response.json({
            note: {
                ...note,
                signedUrl: await getSignedFileUrl(note.fileUrl),
            },
        });
    } catch (error) {
        console.error(`GET /api/notes/${id} failed:`, error);
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
            "Invalid request body. Expected JSON with a title and subjectId.",
            400
        );
    }

    const { title, subjectId, content } = body;

    if (typeof title !== "string" || title.trim() === "") {
        return jsonError("Note title is required", 400);
    }

    if (typeof subjectId !== "string" || subjectId.trim() === "") {
        return jsonError("Subject ID is required", 400);
    }

    try {
        const note = await prisma.note.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!note) {
            return jsonError("Note not found", 404);
        }

        const subject = await prisma.subject.findFirst({
            where: {
                id: subjectId,
                userId: user.id,
            },
        });

        if (!subject) {
            return jsonError("Subject not found", 404);
        }

        // Validate content for written notes
        if (!note.fileUrl) {
            if (content !== undefined && content !== null) {
                if (typeof content !== "string" || content.trim() === "") {
                    return jsonError(
                        "Please add some content to your note.",
                        400
                    );
                }
            }
        }

        const updateData: { title: string; subjectId: string; content?: string } = {
            title: title.trim(),
            subjectId: subject.id,
        };

        // Update content for written notes
        if (!note.fileUrl && content !== undefined && content !== null && typeof content === "string") {
            updateData.content = content.trim();
        }

        const updated = await prisma.note.update({
            where: {
                id: note.id,
            },
            data: updateData,
        });

        return Response.json({
            note: {
                ...updated,
                signedUrl: await getSignedFileUrl(updated.fileUrl),
            },
        });
    } catch (error) {
        console.error(`PATCH /api/notes/${id} failed:`, error);
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
        const note = await prisma.note.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!note) {
            return jsonError("Note not found", 404);
        }

        if (note.fileUrl) {
            try {
                await storage.delete(note.fileUrl);
            } catch (error) {
                console.error(
                    `DELETE /api/notes/${id} storage deletion failed:`,
                    error
                );
                return jsonError("Something went wrong", 500);
            }
        }

        await prisma.note.delete({
            where: {
                id: note.id,
            },
        });

        return Response.json({
            message: "Note deleted successfully",
        });
    } catch (error) {
        console.error(`DELETE /api/notes/${id} failed:`, error);
        return jsonError("Something went wrong", 500);
    }
}
