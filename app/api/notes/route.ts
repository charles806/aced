import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { storage } from "@/app/lib/storage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        const formData = await req.formData();

        const title = formData.get("title");
        const subjectId = formData.get("subjectId");
        const file = formData.get("file");

        // Validate title
        if (typeof title !== "string" || title.trim() === "") {
            return jsonError("Note title is required", 400);
        }

        // Validate subject ID
        if (typeof subjectId !== "string" || subjectId.trim() === "") {
            return jsonError("Subject ID is required", 400);
        }

        // Validate file
        if (!(file instanceof File)) {
            return jsonError("File is required", 400);
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

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return jsonError("File must be 10MB or smaller", 400);
        }

        // Validate file type
        const isPdf = file.type === "application/pdf";
        const isImage = file.type.startsWith("image/");

        if (!isPdf && !isImage) {
            return jsonError(
                "Only PDF and image files are allowed",
                400
            );
        }

        // Convert File to Buffer for Radon Storage
        const buffer = Buffer.from(await file.arrayBuffer());

        // Create a unique storage key
        const key = `users/${user.id}/notes/${crypto.randomUUID()}-${file.name}`;

        // Upload to Radon Storage
        const uploadedFile = await storage.upload({
            key,
            body: buffer,
            contentType: file.type,
            metadata: {
                userId: user.id,
                subjectId: subject.id,
                title: title.trim(),
            },
        });

        // Save note metadata in PostgreSQL
        const result = await prisma.note.create({
            data: {
                title: title.trim(),
                fileName: file.name,
                fileUrl: uploadedFile.url ?? uploadedFile.key,
                fileType: uploadedFile.contentType ?? file.type,
                userId: user.id,
                subjectId: subject.id,
            },
        });

        return Response.json(
            { note: result },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create note error:", error);

        return jsonError("Something went wrong", 500);
    }
}