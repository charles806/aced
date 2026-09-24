import { createActivity } from "@/app/lib/activity";
import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { getSignedFileUrl, storage } from "@/app/lib/storage";
import { Prisma } from "@/app/generated/prisma/client";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get("subjectId");
        const search = searchParams.get("search");
        const fileType = searchParams.get("fileType");

        if (subjectId !== null) {
            if (typeof subjectId !== "string" || subjectId.trim() === "") {
                return jsonError("Subject ID must be a non-empty string", 400);
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
        }

        const where: Prisma.NoteWhereInput = {
            userId: user.id,
        };

        if (subjectId !== null) {
            where.subjectId = subjectId;
        }

        const trimmedSearch = search?.trim();
        if (trimmedSearch) {
            where.title = {
                contains: trimmedSearch,
                mode: "insensitive",
            };
        }

        const trimmedFileType = fileType?.trim();
        if (trimmedFileType) {
            if (trimmedFileType === "written") {
                where.fileType = null;
            } else if (trimmedFileType.endsWith("/*")) {
                where.fileType = { startsWith: trimmedFileType.slice(0, -1) };
            } else {
                where.fileType = { equals: trimmedFileType };
            }
        }

        const notes = await prisma.note.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
        });

        const notesWithUrls = await Promise.all(
            notes.map(async (note) => ({
                ...note,
                signedUrl: await getSignedFileUrl(note.fileUrl),
            }))
        );

        return Response.json({ notes: notesWithUrls });
    } catch (error) {
        console.error("GET /api/notes failed:", error);
        return jsonError("Something went wrong", 500);
    }
}

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
        const content = formData.get("content");

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

        const isFileNote = file instanceof File;

        // Written note: no file, content required
        if (!isFileNote) {
            if (typeof content !== "string" || content.trim() === "") {
                return jsonError(
                    "Please add some content to your note.",
                    400
                );
            }

            const result = await prisma.note.create({
                data: {
                    title: title.trim(),
                    content: content.trim(),
                    userId: user.id,
                    subjectId: subject.id,
                },
            });

            void createActivity({
                userId: user.id,
                type: "note_created",
                noteId: result.id,
                subjectId: result.subjectId,
                label: `Created note "${result.title}"`,
            });

            return Response.json({ note: result }, { status: 201 });
        }

        // File note: file required
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

        void createActivity({
            userId: user.id,
            type: "note_created",
            noteId: result.id,
            subjectId: result.subjectId,
            label: `Created note "${result.title}"`,
        });

        return Response.json({ note: result }, { status: 201 });
    } catch (error) {
        console.error("Create note error:", error);

        return jsonError("Something went wrong", 500);
    }
}