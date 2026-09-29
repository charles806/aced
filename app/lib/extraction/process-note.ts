import { prisma } from "../auth";
import { storage } from "../storage";
import { extractPdfText } from "./pdf";
import { extractImageText } from "./ocr";

const PDF_MIME_TYPE = "application/pdf";
const IMAGE_MIME_PREFIX = "image/";

/**
 * Storage providers can report a MIME type with parameters or inconsistent
 * casing (e.g. "Image/JPEG; charset=binary"), so compare on the bare type.
 */
function normalizeMimeType(value: string | null | undefined): string {
    return (value ?? "").split(";")[0].trim().toLowerCase();
}

export async function processNoteExtraction(noteId: string) {
    try {
        const note = await prisma.note.findFirst({
            where: {
                id: noteId,
            },
        });

        if (!note) {
            return { status: "not_found" };
        }

        const fileType = normalizeMimeType(note.fileType);
        const isPdf = fileType === PDF_MIME_TYPE;
        const isImage = fileType.startsWith(IMAGE_MIME_PREFIX);

        if (!isPdf && !isImage) {
            const fileTypeLabel = note.fileType ?? "unknown";

            await prisma.note.update({
                where: {
                    id: noteId,
                },
                data: {
                    extractionStatus: "failed",
                    extractionError: `Unsupported file type: ${fileTypeLabel}`,
                },
            });

            return {
                status: "unsupported_file_type",
                noteId,
                fileType: note.fileType ?? null,
            };
        }

        if (!note.fileUrl) {
            return { status: "missing_file" };
        }

        await prisma.note.update({
            where: {
                id: noteId,
            },
            data: {
                extractionStatus: "processing",
                extractionError: null,
            },
        });

        const signedUrl = await storage.getUrl(note.fileUrl, {
            signed: true,
            expiresIn: 4500,
        });

        const response = await fetch(signedUrl);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch file (${fileType || "unknown"}): ${response.status}`
            );
        }

        const arrayBuffer = await response.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Both extractors return a string, so everything downstream is
        // source-agnostic.
        const extractedText = isPdf
            ? await extractPdfText(fileBuffer)
            : await extractImageText(fileBuffer);

        await prisma.note.update({
            where: {
                id: noteId,
            },
            data: {
                extractedText,
                extractionStatus: "completed",
                extractionError: null,
            },
        });

        return {
            status: "completed",
            noteId,
            source: isPdf ? "pdf" : "ocr",
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown extraction error";

        try {
            await prisma.note.update({
                where: {
                    id: noteId,
                },
                data: {
                    extractionStatus: "failed",
                    extractionError: message,
                },
            });
        } catch (persistError) {
            console.error("Failed to persist extraction failure:", persistError);
        }

        // Rethrow so the background runner (Inngest) sees the run as failed
        // and can retry. Permanent conditions return normally above.
        throw error instanceof Error ? error : new Error(message);
    }
}
