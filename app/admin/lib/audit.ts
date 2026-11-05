import { prisma } from "@/app/lib/auth";
import { getAdminUser } from "./auth";

export type AdminAction = {
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAdminAction(params: AdminAction) {
  // Derive actor from validated session, do not accept from client
  const admin = await getAdminUser();
  if (!admin) {
    // Do not log unauthenticated attempts with unknown actor
    return;
  }

  // Avoid logging excessive dashboard renders
  const skipActions = new Set(["admin.page_view", "admin.search"]);
  if (skipActions.has(params.action)) {
    return;
  }

  // Strip sensitive fields from metadata if present
  const safeMetadata = params.metadata ? sanitizeMetadata(params.metadata) : undefined;

  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: safeMetadata as any,
      },
    });
  } catch {
    // Audit logging must not break primary flow
  }
}

function sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
  const forbidden = ["password", "token", "secret", "apiKey", "session", "payment", "card"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (forbidden.some(f => k.toLowerCase().includes(f))) continue;
    out[k] = v;
  }
  return out;
}
