-- Komentář k hodnocení účastníka a jeho nahlášení (PO 4. 11., #180, B-060, B-061).
-- Obojí jen přidává: stávající hodnocení mají komentář NULL.

-- AlterEnum
ALTER TYPE "report_target_type" ADD VALUE 'participant_rating';

-- AlterTable
ALTER TABLE "participant_rating" ADD COLUMN     "comment" TEXT;
