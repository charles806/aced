import { createActivity } from "@/app/lib/activity";
import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { storage } from "@/app/lib/storage";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { incrementUsage } from "@/app/lib/billing/limits";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        const body = await req.json();
        const { title, subjectId, fileName, fileType, key } = body;

        // Validate title
        if (typeof title !== "string" || title.trim() === "") {
            return jsonError("Note title is required", 400);
        }

        // Validate subject ID
        if (typeof subjectId !== "string" || subjectId.trim() === "") {
            return jsonError("Subject ID is required", 400);
        }

        // Validate subject ownership
        const subject = await prisma.subject.findFirst({
            where: {
                id: subjectId,
                userId: user.id,
            },
        });

        if (!subject) {
            return jsonError("Subject not found", 404);
        }

        // Validate key
        if (typeof key !== "string" || key.trim() === "") {
            return jsonError("Storage key is required", 400);
        }

        // Verify the file exists in storage
        try {
            const exists = await storage.exists(key);
            if (!exists) {
                return jsonError("File not found in storage. Please upload again.", 400);
            }
        } catch (error) {
            console.error("File not found in storage:", error);
            return jsonError("File not found in storage. Please upload again.", 400);
        }

        // Save note metadata in PostgreSQL
        const result = await prisma.note.create({
            data: {
                title: title.trim(),
                fileName: fileName,
                fileUrl: key,
                fileType: fileType,
                userId: user.id,
                subjectId: subject.id,
            },
        });

        // Trigger content extraction
        await inngest.send({
            name: "note/extraction.requested",
            data: {
                noteId: result.id,
            },
        });

        await incrementUsage(user.id, "notesUploaded");

        void createActivity({
            userId: user.id,
            type: "note_created",
            noteId: result.id,
            subjectId: result.subjectId,
            label: `Created note "${result.title}"`,
        });

        return Response.json({ note: result }, { status: 201 });
    } catch (error) {
        console.error("Complete note upload error:", error);
        return jsonError("Something went wrong", 500);
    }
}