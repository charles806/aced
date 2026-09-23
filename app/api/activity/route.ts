import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";

const ACTIVITY_LIMIT = 20;

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser(req);

        if (!user) {
            return jsonError("Unauthorized", 401);
        }

        const items = await prisma.activity.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: ACTIVITY_LIMIT,
        });

        return Response.json({ items });
    } catch (error) {
        console.error("GET /api/activity failed:", error);
        return jsonError("Something went wrong", 500);
    }
}