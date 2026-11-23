-- AlterTable
ALTER TABLE "user" ADD COLUMN     "homeLocalityChangeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "homeLocalityChangeDay" VARCHAR(10),
ADD COLUMN     "partnerDiscoverable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "partner_skip" (
    "id" TEXT NOT NULL,
    "skipperId" TEXT NOT NULL,
    "skippedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_skip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_skip_skippedId_idx" ON "partner_skip"("skippedId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_skip_skipperId_skippedId_key" ON "partner_skip"("skipperId", "skippedId");

-- AddForeignKey
ALTER TABLE "partner_skip" ADD CONSTRAINT "partner_skip_skipperId_fkey" FOREIGN KEY ("skipperId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_skip" ADD CONSTRAINT "partner_skip_skippedId_fkey" FOREIGN KEY ("skippedId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
