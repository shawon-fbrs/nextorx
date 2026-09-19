-- AlterTable: Add pairId, change unique constraint
ALTER TABLE "ServerSeed" ADD COLUMN "pairId" TEXT NOT NULL DEFAULT '';

-- CreateIndex: Replace single unique with compound unique
DROP INDEX "ServerSeed_day_key";
CREATE UNIQUE INDEX "ServerSeed_day_pairId_key" ON "ServerSeed"("day", "pairId");
CREATE INDEX "ServerSeed_day_pairId_idx" ON "ServerSeed"("day", "pairId");
