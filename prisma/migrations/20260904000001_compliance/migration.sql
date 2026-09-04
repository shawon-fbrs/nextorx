ALTER TABLE "User" ADD COLUMN "depositLimitDaily" INTEGER;

CREATE TABLE "KycSubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tier" TEXT NOT NULL DEFAULT 'TIER_1',
  "idType" TEXT,
  "idNumber" TEXT,
  "idFront" BYTEA,
  "idFrontMime" TEXT,
  "idBack" BYTEA,
  "idBackMime" TEXT,
  "selfie" BYTEA,
  "selfieMime" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KycSubmission_status_createdAt_idx" ON "KycSubmission"("status", "createdAt" DESC);
CREATE INDEX "KycSubmission_userId_createdAt_idx" ON "KycSubmission"("userId", "createdAt" DESC);

CREATE TABLE "SelfExclusion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "excludedUntil" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SelfExclusion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SelfExclusion_userId_key" ON "SelfExclusion"("userId");
CREATE INDEX "SelfExclusion_excludedUntil_idx" ON "SelfExclusion"("excludedUntil");
