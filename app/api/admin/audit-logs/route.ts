import { prisma } from "@/app/lib/auth";
import { getAdminUser } from "@/app/lib/admin";
import { jsonError } from "@/app/lib/api";
import type { Prisma } from "@/app/generated/prisma/client";

export async function GET(req: Request) {
    const { user, error } = await getAdminUser(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
    const action = searchParams.get("action") ?? undefined;
    const targetType = searchParams.get("targetType") ?? undefined;
    const adminUserId = searchParams.get("adminUserId") ?? undefined;
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (adminUserId) where.adminUserId = adminUserId;

    try {
        const [items, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    adminUser: {
                        select: {
                            id: true,
                            email: true,
                            metadata: true,
                        },
                    },
                },
            }),
            prisma.adminAuditLog.count({ where }),
        ]);

        return Response.json({
            items: items.map((log) => ({
                id: log.id,
                adminUserId: log.adminUserId,
                adminUserEmail: log.adminUser.email,
                adminUserName: (log.adminUser.metadata as Record<string, unknown>)?.name ?? null,
                action: log.action,
                targetType: log.targetType,
                targetId: log.targetId,
                metadata: log.metadata,
                createdAt: log.createdAt.toISOString(),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("GET /api/admin/audit-logs failed:", err);
        return jsonError("Something went wrong", 500);
    }
}