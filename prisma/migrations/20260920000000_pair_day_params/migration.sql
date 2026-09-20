-- PairDayParams: frozen daily candle-math inputs for provably fair verification.
-- Safe on any DB state: brand-new table, no column changes to existing tables.
CREATE TABLE IF NOT EXISTS "PairDayParams" (
  "id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "pairId" TEXT NOT NULL,
  "basePrice" DECIMAL(16,8) NOT NULL,
  "volatility" DECIMAL(12,6) NOT NULL,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PairDayParams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PairDayParams_day_pairId_key" ON "PairDayParams"("day", "pairId");
CREATE INDEX IF NOT EXISTS "PairDayParams_day_pairId_idx" ON "PairDayParams"("day", "pairId");
