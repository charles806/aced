import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NormalizedEvent } from "@radonsdk/payments";

const mockQueryRaw = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/app/lib/auth", () => ({
  get prisma() {
    return {
      annualPurchase: {
        findFirst: vi.fn(),
        update: mockUpdate,
        findUnique: mockFindUnique,
      },
      $queryRaw: mockQueryRaw,
      $transaction: mockTransaction,
    };
  },
}));

import { handleAnnualRefundPaid } from "../annual-events";
import { handleAnnualDisputeUpdated } from "../annual-events";

describe("annual events advanced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({});
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: mockQueryRaw,
        annualPurchase: {
          findUnique: mockFindUnique,
          update: mockUpdate,
        },
      };
      return fn(tx);
    });
    mockQueryRaw.mockResolvedValue([{ id: "p1" }]);
  });

  const basePurchase = (metadata = {}) => ({
    id: "p1",
    providerPaymentId: "ch_1",
    status: "succeeded",
    amountUsd: "19.99",
    currency: "USD",
    metadata,
  });

  it("prevents duplicate refunds", async () => {
    mockFindUnique.mockResolvedValue(basePurchase({ processed_refund_ids: ["r1"] }));
    const event: NormalizedEvent = {
      provider: "bachs",
      id: "e1",
      type: "refund.paid",
      providerEventType: "refund.paid",
      objectId: "r1",
      amount: { amount: 1999, currency: "USD" },
      occurredAt: new Date(),
      raw: { data: { charge_id: "ch_1", refund_id: "r1", refunded_amount: "19.99" } },
    };
    await handleAnnualRefundPaid(event);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("accumulates partial refunds to full", async () => {
    mockFindUnique.mockResolvedValue(basePurchase({ cumulative_refunded_minor: 1000, processed_refund_ids: [] }));
    const event: NormalizedEvent = {
      provider: "bachs",
      id: "e1",
      type: "refund.paid",
      providerEventType: "refund.paid",
      objectId: "r2",
      amount: { amount: 999, currency: "USD" },
      occurredAt: new Date(),
      raw: { data: { charge_id: "ch_1", refund_id: "r2", refunded_amount: "9.99" } },
    };
    await handleAnnualRefundPaid(event);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({
        status: "refunded",
        expiresAt: expect.any(Date),
        metadata: expect.objectContaining({
          cumulative_refunded_minor: 1999,
          processed_refund_ids: ["r2"],
        }),
      }),
    });
  });

  it("records partial refund without revoking", async () => {
    mockFindUnique.mockResolvedValue(basePurchase({ cumulative_refunded_minor: 0, processed_refund_ids: [] }));
    const event: NormalizedEvent = {
      provider: "bachs",
      id: "e1",
      type: "refund.paid",
      providerEventType: "refund.paid",
      objectId: "r1",
      amount: { amount: 500, currency: "USD" },
      occurredAt: new Date(),
      raw: { data: { charge_id: "ch_1", refund_id: "r1", refunded_amount: "5.00" } },
    };
    await handleAnnualRefundPaid(event);
    expect(mockUpdate).toHaveBeenCalled();
    const meta = mockUpdate.mock.calls[0][0].data.metadata;
    expect(meta.cumulative_refunded_minor).toBe(500);
    expect(meta.processed_refund_ids).toContain("r1");
  });

  it("dispute stale event protection", async () => {
    const past = new Date(Date.now() - 1000*60*60);
    mockFindUnique.mockResolvedValue(basePurchase({ dispute_id: "d1", dispute_updated_at: past.toISOString() }));
    const now = new Date();
    const event: NormalizedEvent = {
      provider: "bachs",
      id: "e1",
      type: "dispute.updated",
      providerEventType: "dispute.updated",
      objectId: "d1",
      amount: { amount: 1999, currency: "USD" },
      occurredAt: new Date(past.getTime() - 1000), // earlier
      raw: { data: { dispute_id: "d1", charge_id: "ch_1", status: "lost" } },
    };
    await handleAnnualDisputeUpdated(event);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("dispute updated with newer event updates status", async () => {
    const past = new Date(Date.now() - 1000*60*60);
    mockFindUnique.mockResolvedValue(basePurchase({ dispute_id: "d1", dispute_updated_at: past.toISOString() }));
    const event: NormalizedEvent = {
      provider: "bachs",
      id: "e1",
      type: "dispute.updated",
      providerEventType: "dispute.updated",
      objectId: "d1",
      amount: { amount: 1999, currency: "USD" },
      occurredAt: new Date(),
      raw: { data: { dispute_id: "d1", charge_id: "ch_1", status: "lost" } },
    };
    await handleAnnualDisputeUpdated(event);
    expect(mockUpdate).toHaveBeenCalled();
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.status).toBe("disputed_lost");
  });

  it("dispute association requires charge id", async () => {
    mockQueryRaw.mockResolvedValue([]);
    const event: NormalizedEvent = {
      provider: "bachs",
      id: "e1",
      type: "dispute.updated",
      providerEventType: "dispute.updated",
      objectId: "d1",
      amount: { amount: 1999, currency: "USD" },
      occurredAt: new Date(),
      raw: { data: { dispute_id: "d1", status: "lost" } }, // missing charge_id
    };
    await handleAnnualDisputeUpdated(event);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
