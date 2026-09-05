CREATE TABLE "ServerSeed" (
  "id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "seedHash" TEXT NOT NULL,
  "seed" TEXT,
  "revealed" BOOLEAN NOT NULL DEFAULT false,
  "revealedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServerSeed_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServerSeed_day_key" ON "ServerSeed"("day");
CREATE INDEX "ServerSeed_day_idx" ON "ServerSeed"("day");

CREATE TABLE "SecondCandle" (
  "id" TEXT NOT NULL,
  "pairId" TEXT NOT NULL,
  "timestamp" BIGINT NOT NULL,
  "open" DECIMAL(16,8) NOT NULL,
  "high" DECIMAL(16,8) NOT NULL,
  "low" DECIMAL(16,8) NOT NULL,
  "close" DECIMAL(16,8) NOT NULL,
  "ticks" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SecondCandle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SecondCandle_pairId_timestamp_key" ON "SecondCandle"("pairId", "timestamp");
CREATE INDEX "SecondCandle_pairId_timestamp_idx" ON "SecondCandle"("pairId", "timestamp" DESC);
