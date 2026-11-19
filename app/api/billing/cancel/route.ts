import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { isEntitled } from "@/app/lib/billing/entitlement";
import { getSubscriptionState } from "@/app/lib/billing/entitlement";
import { payments } from "@/app/lib/payments";

/**
 * Cancel Pro at the end of the current paid period.
 *
 * Calls the provider with `atPeriodEnd: true` (keeps Pro working through the
 * paid period on Bachs) and records `cancelAtPeriodEnd` locally. Status is
 * intentionally left unchanged — entitlement is confirmed later by the
 * provider's cancellation webhook.
 */
export async function POST(req: Request) {
    const user = await getCurrentUser(req);
    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    let subscription;
    try {
        subscription = await prisma.subscription.findUnique({
            where: { userId: user.id },
        });
    } catch (error) {
        console.error("POST /api/billing/cancel: subscription lookup failed:", error);
        return jsonError("Something went wrong", 500);
    }

    if (!subscription) {
        return jsonError("You don't have an ACED Pro subscription.", 400);
    }

    if (!isEntitled(subscription)) {
        return jsonError("Your subscription isn't active, so there's nothing to cancel.", 400);
    }

    if (!subscription.providerSubscriptionId) {
        return jsonError(
            "We couldn't find the provider reference for your subscription yet. Please try again shortly.",
            400
        );
    }

    try {
        await payments.subscriptions.cancel(subscription.providerSubscriptionId, {
            atPeriodEnd: true,
        });
    } catch (error) {
        console.error("POST /api/billing/cancel: provider call failed:", error);
        return jsonError("We couldn't cancel your subscription. Please try again.", 502);
    }

    try {
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { cancelAtPeriodEnd: true },
        });
    } catch (error) {
        console.error("POST /api/billing/cancel: local update failed:", error);
        return jsonError("Cancellation was recorded by the provider, but syncing failed.", 500);
    }

    const state = await getSubscriptionState(user.id);
    return Response.json({ subscription: state });
}