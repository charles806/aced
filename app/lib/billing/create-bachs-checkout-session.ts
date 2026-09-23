/**
 * Bachs checkout-session creation (server-only).
 *
 * Thin wrapper over the unified payments surface
 * (`payments.subscriptions.create`, provider "bachs"). All Bachs-specific
 * request/response mapping — including the endpoint fix for the stale SDK
 * adapter — lives in `app/lib/billing/bachs-provider.ts`; this file only adapts
 * the plan-catalog + user inputs to the unified `SubscriptionInput` shape.
 *
 * Nothing is written to the database here. A completed (paid) checkout is
 * confirmed exclusively via provider webhooks (`POST /api/webhooks/bachs`),
 * which create/activate the Subscription row.
 */

import { payments } from "@/app/lib/payments";

export type BachsCheckoutSession = {
    checkoutUrl: string;
    checkoutId: string;
};

export type CreateBachsCheckoutSessionInput = {
    /** Bachs catalog product id (recurring) — server-side, never from the frontend. */
    planId: string;
    /** Cart quantity; the product owns the price, so this is just the count. */
    quantity: number;
    customer: { email: string; name?: string };
    successUrl: string;
    cancelUrl: string;
    billingCurrency?: string;
    /** Echoed back on subscription webhook events (max 20 keys). */
    metadata?: Record<string, unknown>;
};

export async function createBachsCheckoutSession(
    input: CreateBachsCheckoutSessionInput
): Promise<BachsCheckoutSession> {
    const result = await payments.subscriptions.create(
        {
            planId: input.planId,
            customer: { email: input.customer.email, name: input.customer.name },
            metadata: input.metadata ?? {},
            providerOptions: {
                successUrl: input.successUrl,
                cancelUrl: input.cancelUrl,
                quantity: input.quantity,
                billingCurrency: input.billingCurrency ?? "USD",
            },
        },
        { provider: "bachs" }
    );

    // Bachs always returns a hosted checkout redirect for recurring products.
    if (!result.redirectUrl) {
        throw new Error(
            "Bachs checkout did not return a redirect URL; cannot start checkout."
        );
    }

    return { checkoutUrl: result.redirectUrl, checkoutId: result.id };
}