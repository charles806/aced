import { jsonError } from "@/app/lib/api";
import { prisma } from "@/app/lib/auth";
import { payments } from "@/app/lib/payments";
import { handleEvent } from "@/app/lib/billing/subscription-events";
import { WebhookSignatureError } from "@radonsdk/payments";
import type { NormalizedEvent } from "@radonsdk/payments";
import { Prisma } from "@/app/generated/prisma/client";

export const runtime = "nodejs";

function isWebhookSignatureError(error: unknown): boolean {
    if (error instanceof WebhookSignatureError) return true;

    // Turbopack dev can load the SDK more than once, breaking `instanceof`.
    // Fall back to the stable name/code on the error.
    return (
        typeof error === "object" &&
        error !== null &&
        (error as { name?: unknown }).name === "WebhookSignatureError" &&
        (error as { code?: unknown }).code === "webhook_signature_invalid"
    );
}

async function claimEvent(event: NormalizedEvent): Promise<boolean> {
    try {
        await prisma.webhookEvent.create({
            data: {
                provider: event.provider,
                eventId: event.id,
                eventType: event.providerEventType,
                processedAt: null,
            },
        });
        return true; // claimed
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            // Another delivery claimed it first
            return false;
        }
        throw error;
    }
}

async function markEventProcessed(event: NormalizedEvent) {
    await prisma.webhookEvent.update({
        where: {
            provider_eventId: {
                provider: event.provider,
                eventId: event.id,
            },
        },
        data: { processedAt: new Date() },
    });
}

async function releaseClaim(event: NormalizedEvent) {
    await prisma.webhookEvent.delete({
        where: {
            provider_eventId: {
                provider: event.provider,
                eventId: event.id,
            },
        },
    }).catch(() => {
        // If it was already processed by another worker, ignore
    });
}

export async function POST(req: Request) {
    const rawBody = await req.text();

    const headers: Record<string, string | string[] | undefined> = {};
    req.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });

    // The Bachs adapter checks the signature under both `bachs-signature` and
    // `x-bachs-signature`, but the timestamp only under `bachs-timestamp`.
    // Real deliveries arrive as `X-Bachs-*`, which normalizes to `x-bachs-*`;
    // alias the no-prefix spelling so the timestamp is always found.
    for (const [name, value] of Object.entries(headers)) {
        if (value !== undefined && name.startsWith("x-bachs-")) {
            headers[name.slice(2)] = value;
        }
    }

    let event: NormalizedEvent;
    try {
        event = await payments.webhooks.handle(
            { body: rawBody, headers },
            { provider: "bachs", dispatch: false }
        );
    } catch (error) {
        if (isWebhookSignatureError(error)) {
            console.error(
                "POST /api/webhooks/bachs: invalid signature:",
                (error as { message?: string }).message
            );
            return jsonError("Invalid webhook signature.", 400);
        }

        console.error("POST /api/webhooks/bachs failed:", error);
        return jsonError("Something went wrong.", 500);
    }

    const claimed = await claimEvent(event);
    if (!claimed) {
        // Already being processed or processed
        return new Response(null, { status: 200 });
    }

    try {
        await handleEvent(event);
        await markEventProcessed(event);
        return new Response(null, { status: 200 });
    } catch (error) {
        console.error("POST /api/webhooks/bachs: handling failed:", error);
        // Release claim so a retry can be attempted
        await releaseClaim(event);
        return jsonError("Something went wrong.", 500);
    }
}