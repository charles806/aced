/**
 * Self-contained Bachs provider adapter (bring-your-own-provider).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  Why this exists
 * ─────────────────────────────────────────────────────────────────────────
 *  The Radon Payments SDK (v0.1.0) ships a Bachs adapter whose checkout and
 *  cancellation endpoints are stale against the current Bachs API (they hit
 *  `POST /v1/checkout/sessions` → 404 and `POST /v1/subscriptions/{id}/cancel`
 *  which no longer exists). npm has no newer SDK version with the fix.
 *
 *  Per the SDK's documented "bring your own provider" mechanism
 *  (`registerProvider` in the SDK docs + index.d.ts), this adapter replaces
 *  the built-in one by slug. It is registered in `app/lib/payments.ts` and the
 *  SDK resolves custom loaders before built-ins, so the rest of the app keeps
 *  using exactly the same surface: `payments.subscriptions.*` and
 *  `payments.webhooks.handle`. Nothing in node_modules is modified.
 *
 *  Official Bachs API followed (docs.bachs.io, current sandbox contract):
 *    - POST   /v1/checkout-sessions          (create checkout → subscription)
 *    - DELETE /v1/subscriptions/{id}         (cancel subscription)
 *    - GET    /v1/subscriptions/{id}         (retrieve subscription)
 *    - GET    /v1/checkout-sessions/{id}     (retrieve a checkout)
 *    - POST   /v1/payments                   (charge path, unverified/untouched)
 *    - POST   /v1/refunds                    (refunds, untouched)
 *
 *  Webhook signature scheme (verified against docs + the built-in adapter):
 *    X-Bachs-Timestamp (unix s) + X-Bachs-Signature = HMAC-SHA256 hex of
 *    `{timestamp}.{raw_body}`, 300s tolerance, compared in constant time.
 *  This matches the off-SDK `parseWebhook` scheme and is unchanged here.
 *
 *  Money: Bachs uses decimal-string amounts; Radon stores minor units. The
 *  adapter converts with `formatMinorUnits` / `toMinorUnits` like the built-in.
 */

import {
    BaseProvider,
    WebhookSignatureError,
    InvalidConfigError,
    bodyToString,
    formatMinorUnits,
    header,
    hmac,
    safeEqual,
    toMinorUnits,
    type CancelSubscriptionOptions,
    type ChargeInput,
    type ChargeResult,
    type NormalizedEvent,
    type ProviderCapabilities,
    type RefundInput,
    type RefundResult,
    type SubscriptionInput,
    type SubscriptionResult,
    type WebhookRequest,
} from "@radonsdk/payments";

const BACHS_SANDBOX_BASE_URL = "https://sandbox-api.bachs.io";
const BACHS_LIVE_BASE_URL = "https://api.bachs.io";

const CHECKOUT_SESSIONS_PATH = "/v1/checkout-sessions";
const SUBSCRIPTIONS_PATH = "/v1/subscriptions";

/** Raw Bachs API response — every field is optional/unknown until validated. */
interface BachsApiResponse {
    id?: unknown;
    checkout_id?: unknown;
    checkout_url?: unknown;
    status?: unknown;
    created_at?: unknown;
    subscription_id?: unknown;
    payment_id?: unknown;
    failure_reason?: unknown;
    currency?: unknown;
    amount?: unknown;
    customer_id?: unknown;
    customer_email?: unknown;
    current_period_end?: unknown;
    cancel_at_period_end?: unknown;
    metadata?: unknown;
    reference?: unknown;
}

export class BachsProvider extends BaseProvider {
    readonly name = "bachs";

    readonly capabilities: ProviderCapabilities = {
        charge: true,
        refund: true,
        partialRefund: true,
        subscriptions: true,
        webhooks: true,
        redirect: true,
        crypto: false,
        currencies: ["NGN", "GHS", "KES", "ZAR", "USD", "EUR", "GBP"],
    };

    private client() {
        const key = this.credential("secretKey");
        this.assertKeyMatchesMode(key);
        const base = this.isTest ? BACHS_SANDBOX_BASE_URL : BACHS_LIVE_BASE_URL;
        return this.http(base, { Authorization: `Bearer ${key}` });
    }

    /** Bachs routes by key prefix; reject a key that contradicts the configured mode. */
    private assertKeyMatchesMode(key: string): void {
        if (this.isTest && key.startsWith("sk_live_")) {
            throw new InvalidConfigError(
                'Bachs is in test mode but a live key ("sk_live_…") was supplied. ' +
                    'Use a "sk_sandbox_…" key or set mode: "live".'
            );
        }
        if (!this.isTest && key.startsWith("sk_sandbox_")) {
            throw new InvalidConfigError(
                'Bachs is in live mode but a sandbox key ("sk_sandbox_…") was supplied. ' +
                    'Use a "sk_live_…" key or set mode: "test".'
            );
        }
    }

    async charge(input: ChargeInput): Promise<ChargeResult> {
        const currency = input.amount.currency.toUpperCase();
        const amount = formatMinorUnits(input.amount.amount, currency);
        const opts = input.providerOptions ?? {};
        const res = await this.client().request<BachsApiResponse>(
            CHECKOUT_SESSIONS_PATH,
            {
                method: "POST",
                headers: input.idempotencyKey
                    ? { "Idempotency-Key": input.idempotencyKey }
                    : undefined,
                json: {
                    customer: input.customer
                        ? { email: input.customer.email, name: input.customer.name }
                        : undefined,
                    product_cart: opts["product_cart"],
                    // Ad-hoc one-off price when no catalog product is supplied.
                    price: opts["product_cart"] ? undefined : { amount, currency },
                    billing_currency: opts["billingCurrency"] ?? currency,
                    success_url: input.returnUrl,
                    cancel_url: opts["cancelUrl"],
                    reference: input.reference,
                    metadata: input.metadata,
                },
            }
        );
        return {
            id: asString(res.checkout_id) ?? asString(res.id) ?? "",
            status: mapCheckoutStatus(asString(res.status) ?? "open"),
            amount: input.amount,
            provider: this.name,
            redirectUrl: asString(res.checkout_url),
            metadata: {
                checkoutId: asString(res.checkout_id) ?? res.id,
                ...(input.metadata ?? {}),
            },
            raw: res,
            createdAt: asDate(res.created_at) ?? this.now(),
        };
    }

    async retrieveCharge(id: string): Promise<ChargeResult> {
        const isCheckout = id.startsWith("chk_");
        const path = isCheckout
            ? `${CHECKOUT_SESSIONS_PATH}/${encodeURIComponent(id)}`
            : `/v1/payments/${encodeURIComponent(id)}`;
        const res = await this.client().request<BachsApiResponse>(path);
        const currency = (asString(res.currency) ?? "USD").toUpperCase();
        const amount =
            typeof res.amount === "number" ? toMinorUnits(res.amount, currency) : 0;
        return {
            id: asString(res.checkout_id) ?? asString(res.id) ?? id,
            status: isCheckout
                ? mapCheckoutStatus(asString(res.status) ?? "open")
                : mapPaymentStatus(asString(res.status)),
            amount: { amount, currency },
            provider: this.name,
            redirectUrl: asString(res.checkout_url),
            failureReason: asString(res.failure_reason),
            metadata: { paymentId: asString(res.payment_id) ?? id },
            raw: res,
            createdAt: asDate(res.created_at) ?? this.now(),
        };
    }

    async refund(input: RefundInput): Promise<RefundResult> {
        const res = await this.client().request<BachsApiResponse>("/v1/refunds", {
            method: "POST",
            headers: input.idempotencyKey
                ? { "Idempotency-Key": input.idempotencyKey }
                : undefined,
            json: {
                payment_id: input.chargeId,
                // Omit `amount` for a full refund; decimal string for a partial one.
                amount: input.amount
                    ? formatMinorUnits(input.amount.amount, input.amount.currency)
                    : undefined,
                reason: input.reason,
            },
        });
        const currency = (asString(res.currency) ?? input.amount?.currency ?? "USD").toUpperCase();
        return {
            id: asString(res.id) ?? "",
            chargeId: input.chargeId,
            status: mapRefundStatus(asString(res.status)),
            amount:
                input.amount ??
                (typeof res.amount === "number"
                    ? { amount: toMinorUnits(res.amount, currency), currency }
                    : { amount: 0, currency }),
            provider: this.name,
            metadata: this.meta(input.metadata),
            raw: res,
            createdAt: asDate(res.created_at) ?? this.now(),
        };
    }

    /**
     * Bachs has no direct subscription-creation endpoint — a subscription is
     * born when the customer completes a hosted checkout for a recurring
     * product (the product owns the price; this server never sends one).
     */
    async createSubscription(input: SubscriptionInput): Promise<SubscriptionResult> {
        if (!input.planId) {
            throw new InvalidConfigError(
                "Bachs subscriptions require `planId` — the id of a recurring Bachs " +
                    "product. The customer completes the returned checkout to start " +
                    "the subscription."
            );
        }

        const opts = input.providerOptions ?? {};
        const res = await this.client().request<BachsApiResponse>(
            CHECKOUT_SESSIONS_PATH,
            {
                method: "POST",
                json: {
                    customer: {
                        email: input.customer.email,
                        name: input.customer.name,
                    },
                    product_cart: [
                        { product_id: input.planId, quantity: opts["quantity"] ?? 1 },
                    ],
                    billing_currency: opts["billingCurrency"] ?? "USD",
                    success_url: opts["successUrl"],
                    cancel_url: opts["cancelUrl"],
                    reference: opts["reference"],
                    metadata: input.metadata,
                },
            }
        );

        return {
            id: asString(res.subscription_id) ?? asString(res.checkout_id) ?? asString(res.id) ?? "",
            status: mapSubscriptionStatus(asString(res.status) ?? "open"),
            // becomes active once the customer completes checkout
            provider: this.name,
            customer: input.customer,
            redirectUrl: asString(res.checkout_url),
            metadata: this.meta(input.metadata),
            raw: res,
            createdAt: asDate(res.created_at) ?? this.now(),
        };
    }

    async cancelSubscription(
        id: string,
        options?: CancelSubscriptionOptions
    ): Promise<void> {
        await this.client().request(`${SUBSCRIPTIONS_PATH}/${encodeURIComponent(id)}`, {
            method: "DELETE",
            json: { cancel_at_period_end: options?.atPeriodEnd ?? false },
        });
    }

    async retrieveSubscription(id: string): Promise<SubscriptionResult> {
        const res = await this.client().request<BachsApiResponse>(
            `${SUBSCRIPTIONS_PATH}/${encodeURIComponent(id)}`
        );
        return {
            id: asString(res.id) ?? id,
            status: mapSubscriptionStatus(asString(res.status)),
            provider: this.name,
            customer: {
                id: asString(res.customer_id),
                email: asString(res.customer_email),
            },
            currentPeriodEnd: asDate(res.current_period_end),
            metadata: this.meta(asRecord(res.metadata)),
            raw: res,
            createdAt: asDate(res.created_at) ?? this.now(),
        };
    }

    parseWebhook(request: WebhookRequest, secret?: string): NormalizedEvent {
        const signingSecret =
            secret ?? this.webhookSecret() ?? this.optionalCredential("webhookSecret");
        if (!signingSecret) {
            throw new WebhookSignatureError(this.name, "No webhook secret configured.");
        }

        const raw = bodyToString(request.body);
        const sigHeader =
            header(request.headers, "bachs-signature") ??
            header(request.headers, "x-bachs-signature");
        if (!sigHeader) {
            throw new WebhookSignatureError(this.name, "Missing bachs-signature header.");
        }

        const { timestamp, signature } = parseSignatureHeader(
            sigHeader,
            header(request.headers, "bachs-timestamp") ??
                header(request.headers, "x-bachs-timestamp")
        );
        if (!timestamp || !signature) {
            throw new WebhookSignatureError(this.name, "Malformed signature header.");
        }

        const ageSec = Math.abs(this.now().getTime() / 1_000 - Number(timestamp));
        if (!Number.isFinite(ageSec) || ageSec > 300) {
            throw new WebhookSignatureError(
                this.name,
                "Webhook timestamp outside the tolerance window."
            );
        }

        const expected = hmac("sha256", signingSecret, `${timestamp}.${raw}`, "hex");
        if (!safeEqual(expected, signature)) {
            throw new WebhookSignatureError(this.name);
        }

        const event = JSON.parse(raw) as unknown;
        const eventRecord = asRecord(event);
        const data = asRecord(eventRecord.data);
        const currency = (asString(data.currency) ?? "USD").toUpperCase();
        const dataAmount = data.amount;

        return {
            type: mapBachsEvent(asString(eventRecord.type) ?? "unknown"),
            provider: this.name,
            id: asString(eventRecord.id) ?? "",
            objectId:
                asString(data.id) ?? asString(data.reference) ?? asString(data.payment_id),
            amount:
                typeof dataAmount === "number"
                    ? { amount: toMinorUnits(dataAmount, currency), currency }
                    : undefined,
            providerEventType: asString(eventRecord.type) ?? "unknown",
            occurredAt: asDate(eventRecord.created_at) ?? this.now(),
            raw: eventRecord,
        };
    }
}

function parseSignatureHeader(
    sigHeader: string,
    timestampHeader: string | undefined
): { timestamp?: string; signature?: string } {
    if (sigHeader.includes("t=") || sigHeader.includes("v1=")) {
        let timestamp: string | undefined;
        let signature: string | undefined;
        for (const part of sigHeader.split(",")) {
            const [k, v] = part.split("=");
            if (k?.trim() === "t") timestamp = v?.trim();
            if (k?.trim() === "v1") signature = v?.trim();
        }
        return { timestamp, signature };
    }
    return { timestamp: timestampHeader, signature: sigHeader.trim() };
}

function mapCheckoutStatus(status: string | undefined): ChargeResult["status"] {
    switch ((status ?? "").toLowerCase()) {
        case "complete":
        case "completed":
        case "paid":
            return "succeeded";
        case "expired":
            return "cancelled";
        case "open":
        case "pending":
        default:
            return "requires_action";
    }
}

function mapPaymentStatus(status: string | undefined): ChargeResult["status"] {
    switch ((status ?? "").toLowerCase()) {
        case "succeeded":
        case "paid":
        case "complete":
        case "completed":
            return "succeeded";
        case "failed":
            return "failed";
        case "pending":
        case "processing":
            return "pending";
        case "canceled":
        case "cancelled":
            return "cancelled";
        default:
            return "pending";
    }
}

function mapRefundStatus(status: string | undefined): RefundResult["status"] {
    switch ((status ?? "").toLowerCase()) {
        case "paid":
        case "succeeded":
        case "completed":
            return "succeeded";
        case "failed":
            return "failed";
        default:
            return "pending";
    }
}

function mapSubscriptionStatus(status: string | undefined): SubscriptionResult["status"] {
    switch ((status ?? "").toLowerCase()) {
        case "active":
            return "active";
        case "trialing":
            return "trialing";
        case "past_due":
            return "past_due";
        case "paused":
            return "paused";
        case "canceled":
        case "cancelled":
            return "cancelled";
        default:
            return "incomplete";
    }
}

function mapBachsEvent(type: string): NormalizedEvent["type"] {
    switch (type) {
        case "collection.succeeded":
            return "payment.succeeded";
        case "collection.failed":
            return "payment.failed";
        case "customer.subscription.created":
            return "subscription.created";
        case "customer.subscription.updated":
            return "subscription.updated";
        case "customer.subscription.deleted":
            return "subscription.cancelled";
        case "refund.paid":
            return "refund.issued";
        case "dispute.created":
            return "dispute.opened";
        case "invoice.paid":
            return "invoice.paid";
        default:
            return "unknown";
    }
}

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