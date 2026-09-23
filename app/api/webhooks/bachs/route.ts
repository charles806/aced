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

async function alreadyProcessed(event: NormalizedEvent): Promise<boolean> {
    const existing = await prisma.webhookEvent.findUnique({
        where: {
            provider_eventId: {
                provider: event.provider,
                eventId: event.id,
            },
        },
        select: { id: true },
    });

    return existing !== null;
}

async function recordProcessed(event: NormalizedEvent) {
    try {
        await prisma.webhookEvent.create({
            data: {
                provider: event.provider,
                eventId: event.id,
                eventType: event.providerEventType,
                processedAt: new Date(),
            },
        });
    } catch (error) {
        // A concurrent delivery may have recorded it first — that's fine.
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return;
        }
        throw error;
    }
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

    try {
        if (await alreadyProcessed(event)) {
            return new Response(null, { status: 200 });
        }

        await handleEvent(event);
        await recordProcessed(event);
    } catch (error) {
        console.error("POST /api/webhooks/bachs: handling failed:", error);
        return jsonError("Something went wrong.", 500);
    }

    return new Response(null, { status: 200 });
}