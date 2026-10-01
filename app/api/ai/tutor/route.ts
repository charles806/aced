import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        const body = await req.json();
        const { noteId } = body;

        if (typeof noteId !== "string" || !noteId.trim()) {
            return jsonError("Note ID is required", 400);
        }

        const note = await prisma.note.findFirst({
            where: {
                id: noteId,
                userId: user.id,
            },
            select: {
                id: true,
                title: true,
                extractedText: true,
                extractionStatus: true,
            },
        });

        if (!note) {
            return jsonError("Note not found", 404);
        }

        if (
            note.extractionStatus !== "completed" ||
            !note.extractedText?.trim()
        ) {
            return jsonError("Note is not ready for AI", 409);
        }

        return NextResponse.json({
            noteId: note.id,
            title: note.title,
            extractedText: note.extractedText,
        });
    } catch (error) {
        console.error("Get AI note context error:", error);
        return jsonError("Something went wrong", 500);
    }
}