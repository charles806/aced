import { NextResponse } from "next/server";
import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { requireProAccess } from "@/app/lib/billing/guard";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const { id } = await params;
  const conversationId = id?.trim();
  if (!conversationId) return jsonError("Conversation ID is required", 400);

  try {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId: user.id },
    });

    if (!conversation) return jsonError("Conversation not found", 404);

    await prisma.aIConversation.delete({ where: { id: conversationId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/ai/tutor/conversations/[id] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return jsonError("Unauthorized", 401);

  const proAccess = await requireProAccess(user.id);
  if (!proAccess.ok) return proAccess.response;

  const { id } = await params;
  const conversationId = id?.trim();
  if (!conversationId) return jsonError("Conversation ID is required", 400);

  const body = await safeJsonBody(req);
  const title = body && typeof (body as Record<string, unknown>).title === "string"
    ? ((body as Record<string, unknown>).title as string).trim()
    : "";

  if (!title || title.length > 100) {
    return jsonError("Title is required and must be 100 characters or fewer", 400);
  }

  try {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId: user.id },
    });

    if (!conversation) return jsonError("Conversation not found", 404);

    const updated = await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { title },
    });

    return NextResponse.json({ id: updated.id, title: updated.title });
  } catch (error) {
    console.error("PATCH /api/ai/tutor/conversations/[id] failed:", error);
    return jsonError("Something went wrong", 500);
  }
}
