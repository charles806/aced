import { createActivity } from "@/app/lib/activity";
import { jsonError, safeJsonBody } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { formatDuration } from "@/app/lib/format";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        const { id } = await params;

        const session = await prisma.studySession.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!session) {
            return jsonError("Study session not found", 404);
        }

        if (session.endedAt) {
            return jsonError("This study session has already ended", 400);
        }

        const body = await safeJsonBody(req);

        let pausedMs = 0;

        if (body) {
            const rawPausedMs = body.pausedMs;

            if (
                rawPausedMs !== undefined &&
                rawPausedMs !== null &&
                (typeof rawPausedMs !== "number" ||
                    !Number.isFinite(rawPausedMs) ||
                    rawPausedMs < 0)
            ) {
                return jsonError("pausedMs must be a non-negative number", 400);
            }

            pausedMs = Math.floor(rawPausedMs ?? 0);
        }

        const endedAt = new Date();
        const wallMs = Math.max(0, endedAt.getTime() - session.startedAt.getTime());
        const durationSeconds = Math.max(
            0,
            Math.round((wallMs - pausedMs) / 1000)
        );

        const updated = await prisma.studySession.update({
            where: { id: session.id },
            data: {
                endedAt,
                pausedMs,
                duration: durationSeconds,
            },
        });

        void createActivity({
            userId: user.id,
            type: "study_session_completed",
            subjectId: session.subjectId,
            label: `Completed a study session · ${formatDuration(durationSeconds)}`,
        });

        return Response.json({ session: updated });
    } catch (error) {
        console.error("PATCH /api/study-sessions/[id] failed:", error);
        return jsonError("Something went wrong", 500);
    }
}