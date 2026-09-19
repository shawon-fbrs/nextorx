-- Step 1: Delete old seeds (old architecture, one per day, no pairId)
DELETE FROM "ServerSeed";

-- Step 2: Add pairId column (safe now — table is empty)
ALTER TABLE "ServerSeed" ADD COLUMN "pairId" TEXT NOT NULL DEFAULT '';

-- Step 3: Replace single unique with compound unique
DROP INDEX IF EXISTS "ServerSeed_day_key";
CREATE UNIQUE INDEX "ServerSeed_day_pairId_key" ON "ServerSeed"("day", "pairId");
CREATE INDEX "ServerSeed_day_pairId_idx" ON "ServerSeed"("day", "pairId");
