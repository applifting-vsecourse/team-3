-- AlterTable
ALTER TABLE "event" ADD COLUMN     "imageKey" TEXT;

-- AlterTable
ALTER TABLE "group" DROP COLUMN "imageUrl",
ADD COLUMN     "imageKey" TEXT;

-- CreateTable
CREATE TABLE "uploaded_image" (
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "small" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_image_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_imageKey_key" ON "event"("imageKey");

-- CreateIndex
CREATE UNIQUE INDEX "group_imageKey_key" ON "group"("imageKey");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_imageKey_fkey" FOREIGN KEY ("imageKey") REFERENCES "uploaded_image"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_imageKey_fkey" FOREIGN KEY ("imageKey") REFERENCES "uploaded_image"("key") ON DELETE SET NULL ON UPDATE CASCADE;


-- Formát a velikost hlídá i databáze (#77); Prisma CHECK ve schématu zapsat neumí
ALTER TABLE "uploaded_image" ADD CONSTRAINT "uploaded_image_content_type_check" CHECK ("contentType" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "uploaded_image" ADD CONSTRAINT "uploaded_image_size_check" CHECK ("size" > 0 AND "size" <= 5242880 AND "size" = octet_length("data"));
