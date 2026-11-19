import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import {
    jsonError,
    safeJsonBody,
    validateNotificationSettings,
    type NotificationPreferenceKey,
} from "@/app/lib/api";

const DEFAULT_SETTINGS: Record<NotificationPreferenceKey, boolean> = {
    studyReminders: true,
    productUpdates: true,
    emailNotifications: true,
};

function pickSettings(row: {
    studyReminders: boolean;
    productUpdates: boolean;
    emailNotifications: boolean;
}) {
    return {
        studyReminders: row.studyReminders,
        productUpdates: row.productUpdates,
        emailNotifications: row.emailNotifications,
    };
}

export async function GET(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    try {
        const row = await prisma.userSettings.findUnique({
            where: { userId: user.id },
        });

        return Response.json({
            settings: row
                ? pickSettings(row)
                : { ...DEFAULT_SETTINGS },
        });
    } catch (error) {
        console.error("GET /api/me/settings failed:", error);
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
            "Invalid request body. Expected JSON with notification preferences.",
            400
        );
    }

    const validated = validateNotificationSettings(body);

    if ("error" in validated) {
        return jsonError(validated.error, 400);
    }

    try {
        const data = {
            ...validated.settings,
        };

        const row = await prisma.userSettings.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                ...DEFAULT_SETTINGS,
                ...data,
            },
            update: data,
        });

        return Response.json({ settings: pickSettings(row) });
    } catch (error) {
        console.error("PATCH /api/me/settings failed:", error);
        return jsonError("Something went wrong", 500);
    }
}