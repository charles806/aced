import { ACED_PRO_QUANTITY, getAcedProProductId } from "./products";

/**
 * Server-side billing plan catalog.
 *
 * This is the single source of truth for subscriptions ACED sells. Prices and
 * product IDs are resolved here (and from the server environment) — they are
 * never accepted from the request body or the frontend.
 *
 * Only "ACED Pro" ($1.99/month) exists today; new plans can be added here and
 * the checkout endpoint expanded later (annual, team, education, …).
 */
export type BillingPlan = {
    name: string;
    /** Decimal string balance, e.g. "1.99". Display/derivation only — Bachs prices the product server-side. */
    amount: string;
    currency: string;
    interval: string;
    /** Value written to `Subscription.plan` when this plan activates. */
    plan: string;
    quantity: number;
    /** Resolves the provider catalog product ID from the server environment (throws if unconfigured). */
    productId: () => string;
};

export const PLANS = {
    pro_monthly: {
        name: "ACED Pro",
        amount: "1.99",
        currency: "USD",
        interval: "month",
        plan: "pro",
        quantity: ACED_PRO_QUANTITY,
        productId: getAcedProProductId,
    },
} satisfies Record<string, BillingPlan>;

export type PlanKey = keyof typeof PLANS;

export const DEFAULT_PLAN_KEY: PlanKey = "pro_monthly";

export function getDefaultPlan(): BillingPlan {
    return PLANS[DEFAULT_PLAN_KEY];
}