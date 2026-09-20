-- RedotPay Connect gateway correlation fields on DepositRequest.
-- All nullable + safe on non-empty tables. Unique indexes allow fast,
-- idempotent webhook matching by either our ref or RedotPay's order SN.
ALTER TABLE "DepositRequest" ADD COLUMN IF NOT EXISTS "gatewayRef" TEXT;
ALTER TABLE "DepositRequest" ADD COLUMN IF NOT EXISTS "gatewayOrderId" TEXT;
ALTER TABLE "DepositRequest" ADD COLUMN IF NOT EXISTS "gatewayRaw" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'DepositRequest_gatewayRef_key') THEN
    CREATE UNIQUE INDEX "DepositRequest_gatewayRef_key" ON "DepositRequest"("gatewayRef");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'DepositRequest_gatewayOrderId_key') THEN
    CREATE UNIQUE INDEX "DepositRequest_gatewayOrderId_key" ON "DepositRequest"("gatewayOrderId");
  END IF;
END $$;
