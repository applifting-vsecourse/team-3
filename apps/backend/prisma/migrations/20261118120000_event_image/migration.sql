-- AlterTable
ALTER TABLE "event" ADD COLUMN     "imageKey" TEXT;
-- CreateTable
CREATE TABLE "event_image" (
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_image_pkey" PRIMARY KEY ("key")
);
-- CreateIndex
CREATE UNIQUE INDEX "event_imageKey_key" ON "event"("imageKey");
-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_imageKey_fkey" FOREIGN KEY ("imageKey") REFERENCES "event_image"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- Formát a velikost hlídá i databáze (#77); Prisma CHECK ve schématu zapsat neumí
ALTER TABLE "event_image" ADD CONSTRAINT "event_image_content_type_check" CHECK ("contentType" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "event_image" ADD CONSTRAINT "event_image_size_check" CHECK ("size" > 0 AND "size" <= 5242880 AND "size" = octet_length("data"));
