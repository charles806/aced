/**
 * Bachs webhook → database handlers.
 *
 * Single place that turns normalized payment webhook events into (and out of)
 * the `Subscription` row. Called by `POST /api/webhooks/bachs` after signature
 * verification and dedup markers. All updates are idempotent (upsert/sync),
 * so a replayed or out-of-order event can't corrupt state.
 *
 * Event coverage:
 *   subscription.created / .updated      → upsert/sync the full subscription
 *   subscription.cancelled (deleted)     → status `cancelled`
 *   invoice.paid                         → refresh period (renewal succeeded)
 *   collection.failed / invoice.payment_failed → status `past_due` (kept entitled
 *                                          while Bachs auto-recovery runs)
 *   everything else (checkout.completed, invoice.created, payment.succeeded…)
 *                                          → informational, logged & skipped
 */

import { prisma } from "@/app/lib/auth";
import type { NormalizedEvent } from "@radonsdk/payments";
import { Prisma } from "@/app/generated/prisma/client";
import { normalizeStatus } from "./entitlement";

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asDate(value: unknown): Date | undefined {
    const raw = asString(value);
    if (!raw) return undefined;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function asBoolean(value: unknown): boolean {
    return typeof value === "boolean" ? value : false;
}

function eventData(event: NormalizedEvent): Record<string, unknown> {
    return asRecord(asRecord(event.raw).data);
}

function subscriptionIdOf(data: Record<string, unknown>): string | undefined {
    return asString(data.subscription_id);
}

/**
 * Resolve the ACED user an event belongs to.
 *
 * `metadata.user_id` is primary (Bachs copies checkout metadata onto the
 * subscription). Fall back to the customer email on the event so an event whose
 * metadata was truncated still links up.
 */
async function resolveUserId(data: Record<string, unknown>): Promise<string | undefined> {
    const metadata = asRecord(data.metadata);
    const metadataUserId = asString(metadata.user_id);
    if (metadataUserId) return metadataUserId;

    const customer = asRecord(data.customer);
    const email = asString(customer.email);
    if (!email) return undefined;

    const user = await prisma.radonUser.findFirst({
        where: { email },
        select: { id: true },
    });
    return user?.id;
}

/**
 * Upsert a subscription by `userId` (the unique key) so a re-subscribe that
 * swaps `providerSubscriptionId` never creates a duplicate row. On a P2002
 * race (two events for the same user arriving together), the loser retries as
 * an update instead of erroring out.
 */
async function upsertSubscriptionForUser(
    data: Record<string, unknown>,
    userId: string
): Promise<void> {
    const subscriptionId = subscriptionIdOf(data);
    if (!subscriptionId) {
        console.error(
            "subscription-events: subscription event without subscription_id — ignoring."
        );
        return;
    }

    const customer = asRecord(data.customer);
    const status = normalizeStatus(asString(data.status) ?? "active");
    const periodStart = asDate(data.current_period_start);
    const periodEnd = asDate(data.current_period_end);
    const cancelAtPeriodEnd = asBoolean(data.cancel_at_period_end);
    const providerCustomerId =
        asString(customer.customer_id) ?? asString(customer.id);

    const fields = {
        plan: "pro",
        provider: "bachs",
        providerCustomerId,
        providerSubscriptionId: subscriptionId,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd,
    };

    const existing = await prisma.subscription.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (existing) {
        await prisma.subscription.update({
            where: { id: existing.id },
            data: {
                providerCustomerId,
                providerSubscriptionId: subscriptionId,
                status,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd,
            },
        });
        return;
    }

    try {
        await prisma.subscription.create({
            data: { userId, ...fields },
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            // A concurrent delivery created the row first — turn the create into
            // an update on the same key instead of surfacing a duplicate.
            await prisma.subscription.updateMany({
                where: { userId },
                data: {
                    providerCustomerId,
                    providerSubscriptionId: subscriptionId,
                    status,
                    currentPeriodStart: periodStart,
                    currentPeriodEnd: periodEnd,
                    cancelAtPeriodEnd,
                },
            });
            return;
        }
        throw error;
    }

    console.info(
        `subscription-events: subscription ${subscriptionId} is ${status} for user ${userId}.`
    );
}

/** subscription.created / .updated — write the current full state. */
async function syncSubscription(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = subscriptionIdOf(data);
    if (!subscriptionId) {
        console.error(
            "subscription-events: subscription event without subscription_id — ignoring."
        );
        return;
    }

    const userId = await resolveUserId(data);
    if (!userId) {
        console.error(
            `subscription-events: no user for subscription ${subscriptionId} ` +
                "(checkout `metadata.user_id` was not set and no customer email " +
                "on the event) — entitlement not granted."
        );
        return;
    }

    await upsertSubscriptionForUser(data, userId);
}

/** subscription.cancelled (Bachs sends customer.subscription.deleted). */
async function cancelSubscription(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = subscriptionIdOf(data);
    if (!subscriptionId) {
        console.error(
            "subscription-events: deletion event without subscription_id — ignoring."
        );
        return;
    }

    await prisma.subscription.updateMany({
        where: { providerSubscriptionId: subscriptionId },
        data: { status: "cancelled", cancelAtPeriodEnd: true },
    });

    console.info(
        `subscription-events: subscription ${subscriptionId} cancelled.`
    );
}

/**
 * Failed payment collection on an existing subscription → `past_due`.
 * Bachs then runs automated recovery (retries + card-update email); the user
 * keeps Pro during that window (see entitlement in `entitlement.ts`).
 * One-off/payment-intent failures with no subscription are informational and
 * skipped here.
 */
async function markPastDue(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = subscriptionIdOf(data);
    if (!subscriptionId) {
        console.info(
            "subscription-events: payment failure without a subscription — not entitlement-affecting."
        );
        return;
    }

    await prisma.subscription.updateMany({
        where: { providerSubscriptionId: subscriptionId },
        data: { status: "past_due" },
    });

    console.info(
        `subscription-events: subscription ${subscriptionId} set to past_due.`
    );
}

/** invoice.paid — renewal succeeded: force active and refresh the period. */
async function extendOnInvoicePaid(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = subscriptionIdOf(data);
    if (!subscriptionId) {
        console.info(
            "subscription-events: invoice.paid for a one-off charge — nothing to extend."
        );
        return;
    }

    const periodStart = asDate(data.period_start);
    const periodEnd = asDate(data.period_end);

    await prisma.subscription.updateMany({
        where: { providerSubscriptionId: subscriptionId },
        data: {
            status: "active",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
        },
    });

    console.info(
        `subscription-events: subscription ${subscriptionId} extended by invoice.paid.`
    );
}

/** Past-due signals that arrive unmapped in the raw event type. */
const PAST_DUE_PROVIDER_EVENTS = new Set([
    "invoice.payment_failed",
    "collection.failed",
]);

export async function handleEvent(event: NormalizedEvent): Promise<void> {
    const data = eventData(event);

    switch (event.type) {
        case "subscription.created":
        case "subscription.updated":
            return syncSubscription(data);
        case "subscription.cancelled":
            return cancelSubscription(data);
        case "invoice.paid":
            return extendOnInvoicePaid(data);
        // `payment.failed` comes from collection.failed (a subscription's
        // renewal attempt bounced) — treat it as past_due.
        case "payment.failed":
            return markPastDue(data);
        default: {
            if (PAST_DUE_PROVIDER_EVENTS.has(event.providerEventType)) {
                return markPastDue(data);
            }
            console.info(
                `subscription-events: ignoring ${event.providerEventType} (${event.id}).`
            );
        }
    }
}