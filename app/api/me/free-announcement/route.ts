import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { jsonError } from "@/app/lib/api";

export async function PATCH(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    try {
        await prisma.userSettings.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                seenFreeAnnouncement: true,
                studyReminders: true,
                productUpdates: true,
                emailNotifications: true,
            },
            update: {
                seenFreeAnnouncement: true,
            },
        });

        return Response.json({ ok: true });
    } catch (error) {
        console.error("PATCH /api/me/free-announcement failed:", error);
        return jsonError("Something went wrong", 500);
    }
}