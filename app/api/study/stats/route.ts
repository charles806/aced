import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";

const DAYS_IN_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        const now = new Date();

        const [sessions, subjects, notes, openedCount, noteCreatedCount] =
            await Promise.all([
                prisma.studySession.findMany({
                    where: {
                        userId: user.id,
                        endedAt: { not: null },
                        duration: { not: null },
                    },
                    select: {
                        startedAt: true,
                        endedAt: true,
                        duration: true,
                        subjectId: true,
                    },
                }),
                prisma.subject.findMany({
                    where: { userId: user.id },
                    select: { id: true, name: true },
                }),
                prisma.note.count({ where: { userId: user.id } }),
                prisma.activity.count({
                    where: { userId: user.id, type: "note_opened" },
                }),
                prisma.activity.count({
                    where: { userId: user.id, type: "note_created" },
                }),
            ]);

        const completed = sessions.filter((s) => s.duration != null);

        const todayStart = startOfDay(now);
        const todayMs = completed
            .filter((s) => s.endedAt!.getTime() >= todayStart.getTime())
            .reduce((sum, s) => sum + s.duration! * 1000, 0);

        const totalMs = completed.reduce(
            (sum, s) => sum + s.duration! * 1000,
            0
        );

        const weekStart = new Date(todayStart.getTime() - 6 * MS_PER_DAY);

        const weekByDay = Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
            const dayStart = new Date(weekStart.getTime() + index * MS_PER_DAY);
            const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);
            const ms = completed
                .filter(
                    (s) =>
                        s.endedAt!.getTime() >= dayStart.getTime() &&
                        s.endedAt!.getTime() < dayEnd.getTime()
                )
                .reduce((sum, s) => sum + s.duration! * 1000, 0);

            return {
                day: dayStart.toLocaleDateString("en-US", {
                    weekday: "short",
                }),
                date: dayStart.toISOString(),
                ms,
            };
        });

        const subjectMap = new Map(
            subjects.map((subject) => [subject.id, subject.name])
        );

        const bySubjectMap = new Map<
            string,
            { subjectId: string | null; subjectName: string; ms: number; sessionCount: number }
        >();

        for (const s of completed) {
            const key = s.subjectId ?? "general";
            const existing = bySubjectMap.get(key);
            const subjectName = s.subjectId
                ? subjectMap.get(s.subjectId) ?? "Unknown subject"
                : "General";

            if (existing) {
                existing.ms += s.duration! * 1000;
                existing.sessionCount += 1;
            } else {
                bySubjectMap.set(key, {
                    subjectId: s.subjectId,
                    subjectName,
                    ms: s.duration! * 1000,
                    sessionCount: 1,
                });
            }
        }

        const bySubject = Array.from(bySubjectMap.values()).sort(
            (a, b) => b.ms - a.ms
        );

        const endedDates = new Set(
            completed.map((s) => startOfDay(s.endedAt!).getTime())
        );

        let streakDays = 0;
        let cursor = startOfDay(now);

        if (!endedDates.has(cursor.getTime())) {
            cursor = new Date(cursor.getTime() - MS_PER_DAY);
        }

        while (endedDates.has(cursor.getTime())) {
            streakDays += 1;
            cursor = new Date(cursor.getTime() - MS_PER_DAY);
        }

        return Response.json({
            stats: {
                todayMs,
                weekMs: weekByDay.reduce((sum, day) => sum + day.ms, 0),
                totalMs,
                sessionCount: completed.length,
                streakDays,
                notesCount: notes,
                notesOpenedCount: openedCount,
                notesCreatedCount: noteCreatedCount,
                subjectsCount: subjects.length,
                weekByDay,
                bySubject,
            },
        });
    } catch (error) {
        console.error("GET /api/study/stats failed:", error);
        return jsonError("Something went wrong", 500);
    }
}