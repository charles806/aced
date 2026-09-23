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
