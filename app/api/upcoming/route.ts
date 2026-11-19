import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { jsonError } from "@/app/lib/api";

export async function GET(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    const userId = user.id;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
        // Fetch in-progress quiz attempts with deadlines
        const quizAttempts = await prisma.quizAttempt.findMany({
            where: {
                userId,
                status: "in_progress",
                deadline: {
                    gte: now,
                    lte: thirtyDaysFromNow,
                },
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { deadline: "asc" },
            take: 50,
        });

        // Fetch recent study sessions (for context, not reminders)
        const studySessions = await prisma.studySession.findMany({
            where: {
                userId,
                startedAt: {
                    gte: now,
                    lte: thirtyDaysFromNow,
                },
            },
            include: {
                subject: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { startedAt: "asc" },
            take: 20,
        });

        // Transform quiz attempts into upcoming items
        const upcomingQuizDeadlines = quizAttempts.map((attempt) => ({
            id: `quiz-${attempt.id}`,
            type: "quiz_deadline" as const,
            title: `Quiz: ${attempt.quiz.title}`,
            description: `In-progress attempt — submit before deadline`,
            dueAt: attempt.deadline.toISOString(),
            quizId: attempt.quiz.id,
            attemptId: attempt.id,
        }));

        // Transform study sessions into upcoming items (if they have future start times)
        // Note: Currently study sessions are started manually, not scheduled.
        // This is future-proofing for scheduled sessions.
        const upcomingStudySessions = studySessions.map((session) => ({
            id: `session-${session.id}`,
            type: "study_session" as const,
            title: session.subject
                ? `Study: ${session.subject.name}`
                : "Study Session",
            description: "Scheduled study session",
            dueAt: session.startedAt.toISOString(),
            subjectId: session.subjectId ?? null,
            sessionId: session.id,
        }));

        // Combine and sort by due date
        const allItems = [...upcomingQuizDeadlines, ...upcomingStudySessions].sort(
            (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
        );

        return Response.json({ items: allItems });
    } catch (error) {
        console.error("GET /api/upcoming failed:", error);
        return jsonError("Something went wrong", 500);
    }
}