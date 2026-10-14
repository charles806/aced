import { NextResponse } from "next/server";
import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";

export const runtime = "nodejs";

/**
 * List conversations for the current user.
 * GET /api/ai/tutor/conversations?noteId=...&limit=20&cursor=...
 * - userId-scoped
 * - optional noteId filter (if provided, only that note's conversations)
 * - limit + cursor pagination, sorted by updatedAt desc
 * - returns { conversations: [{id, noteId, title, preview, lastMessageAt}], nextCursor }
 */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const { searchParams } = new URL(req.url);
  const noteIdParam = searchParams.get("noteId");
  const cursorParam = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");

  let limit = 20;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 50);
    }
  }

  const where: Record<string, unknown> = { userId: user.id };
  if (noteIdParam !== null) {
    const trimmed = noteIdParam.trim();
    if (trimmed !== "") {
      (where as Record<string, unknown>).noteId = trimmed;
    } else {
      // empty string means no filter (all); but if explicitly "null" we could filter null
    }
  }

  // Prisma cursor pagination: if cursor provided, skip 1 and take limit
  const cursor = cursorParam?.trim() ? { id: cursorParam.trim() } : undefined;

  try {
    const conversations = await prisma.aIConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        note: {
          select: { title: true },
        },
      },
    });

    let nextCursor: string | null = null;
    let results = conversations;
    if (conversations.length > limit) {
      nextCursor = conversations[limit].id;
      results = conversations.slice(0, limit);
    }

    const payload = results.map((c) => {
      const last = c.messages[0];
      const preview = last ? last.content.slice(0, 80) : "";
      const title =
        c.title || (c.note?.title ? c.note.title : null) || (preview ? preview.slice(0, 40) : "New chat");
      return {
        id: c.id,
        noteId: c.noteId,
        title,
        preview,
        lastMessageAt: last ? last.createdAt.toISOString() : c.updatedAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ conversations: payload, nextCursor });
  } catch (error) {
    console.error("GET /api/ai/tutor/conversations failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
