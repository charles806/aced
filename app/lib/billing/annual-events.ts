import { prisma } from "@/app/lib/auth";
import type { NormalizedEvent } from "@radonsdk/payments";

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

function eventData(event: NormalizedEvent): Record<string, unknown> {
    return asRecord(asRecord(event.raw).data);
}

/**
 * Process a one-time annual payment success.
 * Security: requires existing pending purchase, validates amount/currency/plan/user.
 * Idempotent: preserves original grantedAt/expiresAt.
 */
export async function handleAnnualPaymentSucceeded(event: NormalizedEvent): Promise<void> {
    const data = eventData(event);
    const metadata = asRecord(data.metadata);
    const plan = asString(metadata.plan);
    if (!plan || !plan.startsWith("pro_annual")) {
        return;
    }

    const checkoutId = asString(data.checkout_id);
    if (!checkoutId) {
        console.error("annual-events: payment.succeeded without checkout_id — ignoring");
        return;
    }

    // Require existing pending purchase
    const pending = await prisma.annualPurchase.findUnique({ where: { providerCheckoutId: checkoutId } });
    if (!pending) {
        console.error(`annual-events: no pending AnnualPurchase for checkout ${checkoutId} — ignoring`);
        return;
    }
    if (pending.status !== "pending") {
        console.info(`annual-events: purchase ${pending.id} already ${pending.status} — idempotent`);
        return;
    }

    // Validate user association
    const userIdFromMeta = asString(metadata.user_id);
    if (userIdFromMeta && userIdFromMeta !== pending.userId) {
        console.error(`annual-events: user mismatch for checkout ${checkoutId}`);
        return;
    }

    if (pending.plan !== plan) {
        console.error(`annual-events: plan mismatch for checkout ${checkoutId}`);
        return;
    }

    // Validate amount and currency
    const eventAmountMinor = typeof event.amount?.amount === "number" ? event.amount.amount : null;
    const eventCurrency = event.amount?.currency?.toUpperCase();
    if (!eventAmountMinor || !eventCurrency) {
        console.error(`annual-events: missing amount/currency for checkout ${checkoutId}`);
        return;
    }

    const expectedUsd = pending.amountUsd;
    if (eventCurrency !== "USD") {
        console.error(`annual-events: unexpected currency ${eventCurrency} for annual purchase`);
        return;
    }

    const expectedMinor = Math.round(parseFloat(expectedUsd) * 100);
    if (eventAmountMinor !== expectedMinor) {
        console.error(`annual-events: amount mismatch for checkout ${checkoutId}: ${eventAmountMinor} != ${expectedMinor}`);
        return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
        await tx.annualPurchase.update({
            where: { id: pending.id },
            data: {
                status: "succeeded",
                providerPaymentId: asString(data.charge_id) ?? undefined,
                amountLocal: (eventAmountMinor / 100).toFixed(2),
                currency: eventCurrency,
                grantedAt: pending.grantedAt ?? now,
                expiresAt: pending.expiresAt ?? expiresAt,
                reference: asString(data.reference) ?? pending.reference,
            },
        });
    });

    console.info(`annual-events: granted 12 months Pro to user ${pending.userId} via ${event.id}`);
}

/**
 * Handle payment failed for annual purchase — mark as failed.
 * Only updates existing pending purchases.
 */
export async function handleAnnualPaymentFailed(event: NormalizedEvent): Promise<void> {
    const data = eventData(event);
    const metadata = asRecord(data.metadata);
    const plan = asString(metadata.plan);
    if (!plan || !plan.startsWith("pro_annual")) return;

    const checkoutId = asString(data.checkout_id);
    if (!checkoutId) return;

    const pending = await prisma.annualPurchase.findUnique({ where: { providerCheckoutId: checkoutId } });
    if (!pending || pending.status !== "pending") return;

    await prisma.annualPurchase.update({
        where: { id: pending.id },
        data: { status: "failed" },
    });
}

/**
 * Handle refund.paid for annual purchases.
 * Policy: full refund revokes entitlement. Partial refund is logged but does not auto-revoke.
 */
export async function handleAnnualRefundPaid(event: NormalizedEvent): Promise<void> {
    const data = eventData(event);
    const chargeId = asString(data.charge_id);
    if (!chargeId) return;

    const purchase = await prisma.annualPurchase.findFirst({
        where: { providerPaymentId: chargeId, status: "succeeded" },
    });
    if (!purchase) return;

    const refundedAmount = asString(data.refunded_amount);
    const requestedAmount = asString(data.requested_amount);
    const expectedMinor = Math.round(parseFloat(purchase.amountUsd) * 100);
    const refundedMinor = refundedAmount ? Math.round(parseFloat(refundedAmount) * 100) : 0;

    if (refundedMinor >= expectedMinor) {
        // Full refund -> revoke entitlement
        await prisma.annualPurchase.update({
            where: { id: purchase.id },
            data: {
                status: "refunded",
                expiresAt: new Date(),
            },
        });
        console.info(`annual-events: full refund revoked entitlement for purchase ${purchase.id}`);
    } else {
        // Partial refund: mark for review, do not revoke automatically
        await prisma.annualPurchase.update({
            where: { id: purchase.id },
            data: {
                metadata: {
                    ...(purchase.metadata as any || {}),
                    partial_refund_at: new Date().toISOString(),
                    partial_refund_amount: refundedAmount,
                },
            },
        });
        console.info(`annual-events: partial refund recorded for purchase ${purchase.id}`);
    }
}

/**
 * Handle dispute.created for annual purchases.
 * Policy: dispute opened does not immediately revoke access; we mark disputed for monitoring.
 */
export async function handleAnnualDisputeCreated(event: NormalizedEvent): Promise<void> {
    const data = eventData(event);
    const chargeId = asString(data.charge_id);
    if (!chargeId) return;

    const purchase = await prisma.annualPurchase.findFirst({
        where: { providerPaymentId: chargeId, status: "succeeded" },
    });
    if (!purchase) return;

    await prisma.annualPurchase.update({
        where: { id: purchase.id },
        data: {
            status: "disputed",
            metadata: {
                ...(purchase.metadata as any || {}),
                dispute_id: asString(data.dispute_id),
                dispute_status: asString(data.status),
                dispute_reason: asString(data.reason),
                dispute_created_at: new Date().toISOString(),
            },
        },
    });
    console.info(`annual-events: dispute opened for purchase ${purchase.id}`);
}

/**
 * Handle dispute status updates where supported.
 * If dispute is lost, revoke entitlement. If won, restore succeeded status.
 */
export async function handleAnnualDisputeUpdated(event: NormalizedEvent): Promise<void> {
    const data = eventData(event);
    const disputeId = asString(data.dispute_id);
    if (!disputeId) return;

    // Find purchase by dispute_id in metadata
    const purchases = await prisma.annualPurchase.findMany({
        where: {
            status: { in: ["succeeded", "disputed"] },
        },
    });
    const purchase = purchases.find(p => (p.metadata as any)?.dispute_id === disputeId);
    if (!purchase) return;

    const status = asString(data.status)?.toLowerCase();
    if (status === "lost") {
        await prisma.annualPurchase.update({
            where: { id: purchase.id },
            data: { status: "disputed_lost", expiresAt: new Date() },
        });
        console.info(`annual-events: dispute lost, revoked entitlement for purchase ${purchase.id}`);
    } else if (status === "won") {
        await prisma.annualPurchase.update({
            where: { id: purchase.id },
            data: { status: "succeeded" },
        });
        console.info(`annual-events: dispute won, restored entitlement for purchase ${purchase.id}`);
    }
}
