import { auth, prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { jsonError, safeJsonBody, validateName } from "@/app/lib/api";

type RadonUserRow = {
    id: string;
    email: string | null;
    emailVerified: boolean;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
};

export function sanitizeUserForClient(user: RadonUserRow) {
    const metadata = { ...(user.metadata ?? {}) };

    delete metadata.__radon;

    return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export async function PATCH(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const body = await safeJsonBody(req);

    if (!body) {
        return jsonError(
            "Invalid request body. Expected JSON with a name.",
            400
        );
    }

    const validated = validateName(body.name);

    if ("error" in validated) {
        return jsonError(validated.error, 400);
    }

    try {
        const raw = await prisma.radonUser.findUnique({
            where: { id: user.id },
            select: { metadata: true },
        });

        if (!raw) {
            return jsonError("User not found", 404);
        }

        // Merge so the SDK's reserved namespace (e.g. the argon2 hash) is preserved.
        const metadata = {
            ...(raw.metadata as Record<string, unknown>),
            name: validated.name,
        };

        const updated = await auth.adapter.updateUser(user.id, { metadata });

        return Response.json({ user: sanitizeUserForClient(updated) });
    } catch (error) {
        console.error("PATCH /api/me failed:", error);
        return jsonError("Something went wrong", 500);
    }
}