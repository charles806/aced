import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { createBachsCheckoutSession } from "@/app/lib/billing/create-bachs-checkout-session";
import { PRO_SUBSCRIPTION_STATUSES } from "@/app/lib/billing/entitlement";
import { getDefaultPlan } from "@/app/lib/billing/plans";

/** Best-effort display name for the Bachs customer (required for new customers). */
function customerName(user: { email: string | null; metadata: unknown }): string | undefined {
    const metadata =
        typeof user.metadata === "object" &&
        user.metadata !== null &&
        !Array.isArray(user.metadata)
            ? (user.metadata as Record<string, unknown>)
            : {};
    const fromMetadata = metadata.name;
    if (typeof fromMetadata === "string" && fromMetadata.trim() !== "") {
        return fromMetadata.trim();
    }
    if (user.email) return user.email.split("@")[0] || undefined;
    return undefined;
}

export async function POST(req: Request) {
    const user = await getCurrentUser(req);

    if (!user) {
        return jsonError("Unauthorized", 401);
    }

    // Check the user's existing Subscription record (read-only). Creating a
    // checkout never activates anything — entitlement comes from provider
    // webhooks, which are handled separately.
    let existingSubscription: { status: string } | null;
    try {
        existingSubscription = await prisma.subscription.findUnique({
            where: { userId: user.id },
            select: { status: true },
        });
    } catch (error) {
        console.error("POST /api/billing/checkout: subscription lookup failed:", error);
        return jsonError("Something went wrong", 500);
    }

    if (existingSubscription && PRO_SUBSCRIPTION_STATUSES.has(existingSubscription.status)) {
        return jsonError(
            `You already have an active ${getDefaultPlan().name} subscription.`,
            400
        );
    }

    try {
        // A checkout needs a customer email; it never comes from the request body.
        if (!user.email) {
            return jsonError("Your account has no email address", 400);
        }

        const baseUrl = process.env.BASE_URL?.trim().replace(/\/+$/, "");

        if (!baseUrl) {
            return jsonError("Server is missing its public URL", 502);
        }

        // Server-side plan catalog — prices and product IDs never come from
        // the frontend. See app/lib/billing/plans.ts.
        const plan = getDefaultPlan();

        let productId: string;

        try {
            productId = plan.productId();
        } catch {
            console.error(
                "POST /api/billing/checkout: product ID is not configured."
            );
            return jsonError("Checkout is not configured yet. Please try again later.", 502);
        }

        const checkout = await createBachsCheckoutSession({
            planId: productId,
            quantity: plan.quantity,
            customer: { email: user.email, name: customerName(user) },
            successUrl: `${baseUrl}/billing/success`,
            cancelUrl: `${baseUrl}/billing/cancelled`,
            billingCurrency: "USD",
            // Bachs echoes this on subscription webhook events; the webhook uses
            // it to link the subscription back to this user.
            metadata: { user_id: user.id },
        });

        // Creating a checkout never creates or activates a subscription —
        // entitlement is confirmed from provider webhooks (out of scope for now).
        return Response.json({ checkoutUrl: checkout.checkoutUrl });
    } catch (error) {
        console.error("POST /api/billing/checkout failed:", error);
        return jsonError("We couldn't start checkout. Please try again.", 502);
    }
}