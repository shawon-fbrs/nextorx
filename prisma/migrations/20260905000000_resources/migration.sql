CREATE TABLE "ResourceCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResourceCategory_name_key" ON "ResourceCategory"("name");

CREATE TABLE "ResourceAsset" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResourceAsset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ResourceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ResourceAsset_categoryId_createdAt_idx" ON "ResourceAsset"("categoryId", "createdAt" DESC);
