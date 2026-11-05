CREATE TABLE "AnnualPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'bachs',
    "providerCheckoutId" TEXT,
    "providerPaymentId" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amountUsd" TEXT NOT NULL,
    "amountLocal" TEXT,
    "currency" TEXT NOT NULL,
    "reference" TEXT,
    "metadata" JSONB,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnnualPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnualPurchase_providerCheckoutId_key" ON "AnnualPurchase"("providerCheckoutId");
CREATE UNIQUE INDEX "AnnualPurchase_providerPaymentId_key" ON "AnnualPurchase"("providerPaymentId");
CREATE INDEX "AnnualPurchase_userId_idx" ON "AnnualPurchase"("userId");
CREATE INDEX "AnnualPurchase_status_idx" ON "AnnualPurchase"("status");

ALTER TABLE "AnnualPurchase" ADD CONSTRAINT "AnnualPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RadonUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
