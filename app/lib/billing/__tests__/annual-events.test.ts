import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NormalizedEvent } from "@radonsdk/payments";

const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/app/lib/auth", () => ({
    get prisma() {
        return {
            annualPurchase: {
                findUnique: mockFindUnique,
                findFirst: mockFindFirst,
                create: mockCreate,
                update: mockUpdate,
                updateMany: vi.fn(),
            },
            $transaction: mockTransaction,
        };
    },
}));

import { handleAnnualPaymentSucceeded } from "../annual-events";

describe("annual-events security", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(async (fn) => fn({
            annualPurchase: { update: mockUpdate },
        }));
    });

    const makeEvent = (overrides: Partial<NormalizedEvent> = {}): NormalizedEvent => ({
        provider: "bachs",
        id: "evt_1",
        type: "payment.succeeded",
        providerEventType: "collection.succeeded",
        objectId: "chk_1",
        amount: { amount: 1999, currency: "USD" },
        occurredAt: new Date(),
        raw: {
            data: {
                checkout_id: "chk_123",
                charge_id: "ch_123",
                metadata: { plan: "pro_annual", user_id: "u1", amount_usd: "19.99" },
            },
        },
        ...overrides,
    });

    it("requires pending purchase", async () => {
        mockFindUnique.mockResolvedValue(null);
        await handleAnnualPaymentSucceeded(makeEvent());
        expect(mockFindUnique).toHaveBeenCalled();
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects underpayment", async () => {
        mockFindUnique.mockResolvedValue({
            id: "p1",
            userId: "u1",
            plan: "pro_annual",
            amountUsd: "19.99",
            status: "pending",
        });
        const event = makeEvent({ amount: { amount: 1000, currency: "USD" } });
        await handleAnnualPaymentSucceeded(event);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects wrong currency", async () => {
        mockFindUnique.mockResolvedValue({
            id: "p1",
            userId: "u1",
            plan: "pro_annual",
            amountUsd: "19.99",
            status: "pending",
        });
        const event = makeEvent({ amount: { amount: 1999, currency: "NGN" } });
        await handleAnnualPaymentSucceeded(event);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("grants entitlement on correct payment", async () => {
        mockFindUnique.mockResolvedValue({
            id: "p1",
            userId: "u1",
            plan: "pro_annual",
            amountUsd: "19.99",
            status: "pending",
            grantedAt: null,
            expiresAt: null,
        });
        await handleAnnualPaymentSucceeded(makeEvent());
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "p1" },
            data: expect.objectContaining({ status: "succeeded" }),
        });
    });

    it("is idempotent and preserves dates", async () => {
        const now = new Date();
        mockFindUnique.mockResolvedValue({
            id: "p1",
            userId: "u1",
            plan: "pro_annual",
            amountUsd: "19.99",
            status: "pending",
            grantedAt: now,
            expiresAt: new Date(now.getTime() + 365*86400000),
        });
        await handleAnnualPaymentSucceeded(makeEvent());
        expect(mockUpdate).toHaveBeenCalled();
        const callData = mockUpdate.mock.calls[0][0].data;
        expect(callData.grantedAt).toEqual(now);
    });
});
