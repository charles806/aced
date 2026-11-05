import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { getCurrentUser } from "@/app/lib/auth/get-current-user";
import { payments } from "@/app/lib/payments";
import { getOneTimePlan } from "@/app/lib/billing/plans";
import { PRO_SUBSCRIPTION_STATUSES } from "@/app/lib/billing/entitlement";
import { decimalStringToMinor, validateDecimalAmount } from "@/app/lib/billing/decimal";

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
    if (!user.email) {
        return jsonError("Your account has no email address", 400);
    }

    // Prevent duplicate active pro entitlement from monthly subscription
    const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { status: true },
    });
    if (existingSubscription && PRO_SUBSCRIPTION_STATUSES.has(existingSubscription.status)) {
        // Allow purchase but warn? Requirement: allow purchase, do not lose time.
        // We will allow but still create checkout.
    }

    const plan = getOneTimePlan("pro_annual");
    const baseUrl = process.env.BASE_URL?.trim().replace(/\/+$/, "");
    if (!baseUrl) {
        return jsonError("Server is missing its public URL", 502);
    }

    // Validate plan amount using exact decimal arithmetic
    try {
        validateDecimalAmount(plan.amount, plan.currency);
    } catch (e) {
        return jsonError(`Invalid plan configuration: ${(e as Error).message}`, 500);
    }

    // Create pending AnnualPurchase record for idempotency tracking
    const reference = `aced_annual_${user.id}_${Date.now()}`;

    // Create checkout via Bachs charge with pricing raw amount
    // Use NGN_BANK_TRANSFER restriction if desired, but keep generic for now
    try {
        const amountMinor = decimalStringToMinor(plan.amount, plan.currency);
        const result = await payments.charge(
            {
                amount: { amount: amountMinor, currency: plan.currency },
                customer: { email: user.email, name: customerName(user) },
                reference,
                returnUrl: `${baseUrl}/billing/success`,
                metadata: {
                    user_id: user.id,
                    plan: plan.plan,
                    amount_usd: plan.amount,
                    amount_currency: plan.currency,
                },
                providerOptions: {
                    // Ensure one-time pricing. Bachs adapter uses pricing when product_cart is absent.
                    // We'll rely on charge implementation.
                    // For bank transfer restriction, uncomment below once verified:
                    // payment_method_types: ["NGN_BANK_TRANSFER"]
                },
            },
            { provider: "bachs" }
        );

        if (!result.redirectUrl) {
            throw new Error("No redirect URL from provider");
        }

        // Upsert pending purchase
        await prisma.annualPurchase.upsert({
            where: { providerCheckoutId: result.id },
            update: {
                status: "pending",
                reference,
                amountUsd: plan.amount,
                currency: plan.currency,
                metadata: {
                    user_id: user.id,
                    plan: plan.plan,
                },
            },
            create: {
                userId: user.id,
                provider: "bachs",
                providerCheckoutId: result.id,
                plan: plan.plan,
                status: "pending",
                amountUsd: plan.amount,
                currency: plan.currency,
                reference,
                metadata: {
                    user_id: user.id,
                    plan: plan.plan,
                    amount_usd: plan.amount,
                },
            },
        });

        return Response.json({ checkoutUrl: result.redirectUrl, checkoutId: result.id });
    } catch (error) {
        console.error("Annual checkout creation failed:", error);
        return jsonError("We couldn't start checkout. Please try again.", 502);
    }
}
