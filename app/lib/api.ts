export function jsonError(error: string, status: number) {
    return Response.json({ error }, { status });
}

export async function safeJsonBody(
    req: Request
): Promise<Record<string, unknown> | null> {
    try {
        const body = await req.json();

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return null;
        }

        return body as Record<string, unknown>;
    } catch {
        return null;
    }
}

export function validateSubjectName(
    value: unknown
): { name: string } | { error: string } {
    if (typeof value !== "string" || value.trim() === "") {
        return { error: "Subject name is required" };
    }

    const name = value.trim();

    if (name.length > 100) {
        return { error: "Subject name must be 100 characters or fewer" };
    }

    return { name };
}

export function validateSubjectId(
    value: unknown
): { subjectId: string } | { error: string } {
    if (typeof value !== "string" || value.trim() === "") {
        return { error: "Subject ID must be a non-empty string" };
    }

    return { subjectId: value.trim() };
}

export function validateName(
    value: unknown
): { name: string } | { error: string } {
    if (typeof value !== "string" || value.trim() === "") {
        return { error: "Name is required" };
    }

    const name = value.trim();

    if (name.length > 100) {
        return { error: "Name must be 100 characters or fewer" };
    }

    return { name };
}

export type NotificationPreferenceKey =
    | "studyReminders"
    | "productUpdates"
    | "emailNotifications";

export function validateNotificationSettings(
    value: unknown
):
    | { settings: Partial<Record<NotificationPreferenceKey, boolean>> }
    | { error: string } {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { error: "Invalid notification preferences payload" };
    }

    const body = value as Record<string, unknown>;
    const settings: Partial<Record<NotificationPreferenceKey, boolean>> = {};

    for (const key of [
        "studyReminders",
        "productUpdates",
        "emailNotifications",
    ] as const) {
        if (key in body) {
            if (typeof body[key] !== "boolean") {
                return {
                    error: "Notification preferences must be true or false",
                };
            }

            settings[key] = body[key];
        }
    }

    if (Object.keys(settings).length === 0) {
        return {
            error: "No notification preferences were provided",
        };
    }

    return { settings };
}
