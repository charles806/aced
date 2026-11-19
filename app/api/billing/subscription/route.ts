import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";

const PRO_SUBSCRIPTION_STATUSES = new Set([
  "active", "trialing", "past_due", "unpaid", "canceled", "paused", "cancelled"
]);

function normalizeStatus(status: string): string {
  return status === "canceled" ? "cancelled" : status;
}

export async function GET(req: Request) {
    const user = await getCurrentUser(req);
    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    let subscription;
    try {
        subscription = await prisma.subscription.findUnique({
            where: { userId: user.id },
            select: {
                plan: true,
                status: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                cancelAtPeriodEnd: true,
            },
        });
    } catch (error) {
        console.error("GET /api/billing/subscription failed:", error);
        return jsonError("Something went wrong", 500);
    }

    if (!subscription) {
        return Response.json({ subscription: null });
    }

    const normalizedStatus = normalizeStatus(subscription.status);
    const hasProAccess = PRO_SUBSCRIPTION_STATUSES.has(normalizedStatus);

    return Response.json({
        subscription: {
            isPro: hasProAccess,
            status: normalizedStatus,
            plan: subscription.plan,
            currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
    });
}