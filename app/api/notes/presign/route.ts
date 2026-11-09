import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { storage } from "@/app/lib/storage";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { canUseFreeFeature, incrementUsage } from "@/app/lib/billing/limits";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        // Check free tier limit for notes upload
        const notesLimit = await canUseFreeFeature(user.id, "notesUploaded");
        if (!notesLimit.allowed) {
            return jsonError(
                `Free tier limit reached: you can upload up to ${notesLimit.limit} notes. Upgrade to Pro for unlimited uploads.`,
                403
            );
        }

        const body = await req.json();
        const { title, subjectId, fileName, fileType, fileSize } = body;

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

        // Validate file name
        if (typeof fileName !== "string" || fileName.trim() === "") {
            return jsonError("File name is required", 400);
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(fileType)) {
            return jsonError("Only PDF and image files are allowed", 400);
        }

        // Validate file size
        if (typeof fileSize !== "number" || fileSize > MAX_FILE_SIZE) {
            return jsonError("File must be 20MB or smaller", 400);
        }

        // Create a unique storage key
        const key = `users/${user.id}/notes/${crypto.randomUUID()}-${fileName}`;

        // Generate presigned PUT URL for direct browser upload (valid for 15 minutes)
        const presignedUrl = await storage.getUrl(key, {
            signed: true,
            method: "PUT",
            expiresIn: 900, // 15 minutes
            responseContentType: fileType,
        });

        return Response.json({
            presignedUrl,
            key,
            expiresIn: 900,
        });
    } catch (error) {
        console.error("Presign upload error:", error);
        return jsonError("Something went wrong", 500);
    }
}