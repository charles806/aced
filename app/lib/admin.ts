import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";

/**
 * Check if the current user is an admin.
 * Admin status is stored in user metadata.
 */
export async function getAdminUser(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return { user: null, error: jsonError("Unauthorized", 401) as Response };
    }

    // Check admin flag in metadata
    const metadata = (user.metadata as Record<string, unknown>) ?? {};
    const isAdmin = metadata.isAdmin === true;

    if (!isAdmin) {
        return { user: null, error: jsonError("Forbidden: Admin access required", 403) as Response };
    }

    return { user, error: null };
}

/**
 * Helper to make a user an admin (for initial setup).
 * Run via script or admin panel.
 */
export async function setUserAdmin(userId: string, isAdmin: boolean) {
    const user = await prisma.radonUser.findUnique({
        where: { id: userId },
        select: { metadata: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    const metadata = { ...(user.metadata as Record<string, unknown>), isAdmin };
    await prisma.radonUser.update({
        where: { id: userId },
        data: { metadata },
    });
}