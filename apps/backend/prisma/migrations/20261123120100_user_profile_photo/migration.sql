-- AlterTable (#64): profilová fotka jako obrázky akcí a skupin (#77)
ALTER TABLE "user" ADD COLUMN     "photoImageKey" TEXT,
ALTER COLUMN "pastEventsVisibility" SET DEFAULT 'friends';

-- CreateIndex
CREATE UNIQUE INDEX "user_photoImageKey_key" ON "user"("photoImageKey");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_photoImageKey_fkey" FOREIGN KEY ("photoImageKey") REFERENCES "uploaded_image"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- Navštívené akce dosud neviděl nikdo cizí (#179): kdo nastavení nezměnil, ukazuje je
-- přátelům a organizátorům svých akcí, ne všem
UPDATE "user" SET "pastEventsVisibility" = 'friends' WHERE "pastEventsVisibility" = 'everyone';
