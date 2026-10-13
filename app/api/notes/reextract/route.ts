import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const notes = await prisma.note.findMany({
      where: {
        userId: user.id,
        fileUrl: {
          not: null,
        },
        extractionStatus: {
          in: ["pending", "failed"],
        },
      },
      select: {
        id: true,
      },
    });

    if (notes.length === 0) {
      return Response.json({
        requested: 0,
        noteIds: [],
      });
    }

    await inngest.send(
      notes.map((note) => ({
        name: "note/extraction.requested",
        data: {
          noteId: note.id,
        },
      })),
    );

    return Response.json({
      requested: notes.length,
      noteIds: notes.map((note) => note.id),
    });
  } catch (error) {
    console.error("POST /api/notes/reextract failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
