import { auth, prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { jsonError, safeJsonBody, validateName } from "@/app/lib/api";
import { cookies } from "next/headers";

type RadonUserRow = {
    id: string;
    email: string | null;
    emailVerified: boolean;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
};

function sanitizeUserForClient(user: RadonUserRow) {
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

export async function GET(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    try {
        const row = await prisma.radonUser.findUnique({
            where: { id: user.id },
        });

        if (!row) {
            return jsonError("User not found", 404);
        }

        return Response.json({
            user: sanitizeUserForClient({
                ...row,
                metadata: (row.metadata as Record<string, unknown>) ?? {},
            }),
        });
    } catch (error) {
        console.error("GET /api/me failed:", error);
        return jsonError("Something went wrong", 500);
    }
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

export async function DELETE(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const userId = user.id;

    try {
        // Delete all user data in a transaction.
        // Cascade deletes handle most relations (notes, subjects, flashcards, quizzes, etc.),
        // but we must explicitly delete Radon auth models that don't cascade from RadonUser.
        await prisma.$transaction(async (tx) => {
            // Delete Radon auth records for this user
            await tx.radonRefreshToken.deleteMany({ where: { userId } });
            await tx.radonApiKey.deleteMany({ where: { userId } });
            await tx.radonSession.deleteMany({ where: { userId } });
            await tx.radonIdentity.deleteMany({ where: { userId } });

            // Delete the RadonUser - cascade handles all user-owned data
            await tx.radonUser.delete({ where: { id: userId } });
        });

        // Clear the session cookie
        const cookieStore = await cookies();
        cookieStore.set("aced_session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return Response.json({ ok: true });
    } catch (error) {
        console.error("DELETE /api/me failed:", error);
        return jsonError("Something went wrong", 500);
    }
}