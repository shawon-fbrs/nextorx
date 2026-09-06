CREATE TABLE "PairVolRegime" (
  "id" TEXT NOT NULL,
  "pairId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "hour" INTEGER NOT NULL,
  "sigmaMult" DECIMAL(8,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PairVolRegime_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PairVolRegime_pairId_day_hour_key" ON "PairVolRegime"("pairId", "day", "hour");
CREATE INDEX "PairVolRegime_day_hour_idx" ON "PairVolRegime"("day", "hour");
