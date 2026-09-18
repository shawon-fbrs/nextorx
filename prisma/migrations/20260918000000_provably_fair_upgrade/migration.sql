-- AlterTable
ALTER TABLE "ServerSeed" ADD COLUMN "gistId" TEXT,
ADD COLUMN "gistUrl" TEXT,
ADD COLUMN "committedAt" TIMESTAMP(3),
ADD COLUMN "regimeSnapshot" JSONB;

-- AlterTable
ALTER TABLE "SecondCandle" ADD COLUMN "hash" TEXT,
ADD COLUMN "prevHash" TEXT;
