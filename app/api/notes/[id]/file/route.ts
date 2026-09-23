import { createActivity } from "@/app/lib/activity";
import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { storage } from "@/app/lib/storage";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 900; // 15 minutes

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

        if (!note.fileUrl) {
            return jsonError("This note has no file", 404);
        }

        const exists = await storage.exists(note.fileUrl);

        if (!exists) {
            return jsonError("This file is no longer available", 404);
        }

        const url = await storage.getUrl(note.fileUrl, {
            signed: true,
            expiresIn: SIGNED_URL_TTL_SECONDS,
            responseContentType: note.fileType ?? undefined,
        });

        void createActivity({
            userId: user.id,
            type: "note_opened",
            noteId: note.id,
            subjectId: note.subjectId,
            label: `Opened note "${note.title}"`,
        });

        return Response.json({
            url,
            fileType: note.fileType,
            fileName: note.fileName,
            title: note.title,
        });
    } catch (error) {
        console.error(`GET /api/notes/${id}/file failed:`, error);
        return jsonError("Something went wrong", 500);
    }
}
