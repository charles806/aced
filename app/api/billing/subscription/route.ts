import { jsonError } from "@/app/lib/api";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { getSubscriptionState } from "@/app/lib/billing/entitlement";

export async function GET(req: Request) {
    const user = await getCurrentUser(req);
    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    let state;
    try {
        state = await getSubscriptionState(user.id);
    } catch (error) {
        console.error("GET /api/billing/subscription failed:", error);
        return jsonError("Something went wrong", 500);
    }

    return Response.json({
        subscription: state
            ? {
                  isPro: state.hasProAccess,
                  status: state.status,
                  plan: state.plan,
                  currentPeriodStart: state.currentPeriodStart,
                  currentPeriodEnd: state.currentPeriodEnd,
                  cancelAtPeriodEnd: state.cancelAtPeriodEnd,
              }
            : null,
    });
}