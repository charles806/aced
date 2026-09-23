/**
 * ACED Pro entitlement rules.
 *
 * Source of truth for "does this user have Pro right now?". Mirrors the
 * product decision: Pro is kept during Bachs's automated failed-payment
 * recovery window, so `past_due` still counts as entitled. Access is lost only
 * when the subscription reaches `unpaid`, `canceled`, or `paused` — or when a
 * period-ended cancellation hasn't been reconciled by the provider yet
 * (the safety net below).
 */

import { prisma } from "@/app/lib/auth";

/** Bachs calls it "canceled"; the rest of ACED uses "cancelled". */
export function normalizeStatus(status: string): string {
    return status === "canceled" ? "cancelled" : status;
}

/**
 * Statuses that grant ACED Pro. `past_due` is included because Bachs runs
 * automated recovery (retries + card-update emails) before a subscription can
 * fall to `unpaid`/`canceled` — the user kept their Pro during that window.
 */
export const PRO_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isProStatus(status: string): boolean {
    return PRO_SUBSCRIPTION_STATUSES.has(status);
}

export type EntitlementFields = {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
};

/**
 * Core entitlement predicate.
 *
 * Safety net: if a renewal was canceled (`cancelAtPeriodEnd`) and the paid
 * period has already ended, the provider should have moved us to `cancelled`
 * already — but until that webhook lands, don't keep granting Pro.
 */
export function isEntitled(state: EntitlementFields): boolean {
    if (!isProStatus(state.status)) return false;

    if (
        state.cancelAtPeriodEnd &&
        state.currentPeriodEnd !== null &&
        state.currentPeriodEnd.getTime() <= Date.now()
    ) {
        return false;
    }

    return true;
}

export type SubscriptionState = {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasProAccess: boolean;
};

/** Serializable billing state for the API/frontend, or null for a free user. */
export async function getSubscriptionState(
    userId: string
): Promise<SubscriptionState | null> {
    const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
        },
    });

    if (!subscription) return null;

    return {
        plan: subscription.plan,
        status: normalizeStatus(subscription.status),
        currentPeriodEnd:
            subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        hasProAccess: isEntitled(subscription),
    };
}

/** Cheap check used by routes that only need a yes/no. */
export async function hasProAccess(userId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { status: true, cancelAtPeriodEnd: true, currentPeriodEnd: true },
    });

    if (!subscription) return false;
    return isEntitled(subscription);
}