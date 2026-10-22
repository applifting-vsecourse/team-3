-- Locality.name is not unique (several villages share a name), so the seed
-- matches localities by a stable slug instead.

-- AlterTable
ALTER TABLE "locality" ADD COLUMN "slug" TEXT;

-- Backfill existing rows with the same slugs the seed uses ("Praha 1" -> "praha-1",
-- "Ústí nad Labem" -> "usti-nad-labem"). A duplicate name gets its id appended so
-- the unique index below can be created; the seed then keeps its own row.
WITH slugged AS (
  SELECT
    "id",
    trim(BOTH '-' FROM regexp_replace(
      lower(translate("name",
        'áäčďéěëíňóöřšťúůüýžÁÄČĎÉĚËÍŇÓÖŘŠŤÚŮÜÝŽ',
        'aacdeeeinoorstuuuyzAACDEEEINOORSTUUUYZ')),
      '[^a-z0-9]+', '-', 'g')) AS "base"
  FROM "locality"
),
numbered AS (
  SELECT "id", "base", row_number() OVER (PARTITION BY "base" ORDER BY "id") AS "n"
  FROM slugged
)
UPDATE "locality" AS l
SET "slug" = CASE WHEN numbered."n" = 1 THEN numbered."base" ELSE numbered."base" || '-' || l."id" END
FROM numbered
WHERE numbered."id" = l."id";

ALTER TABLE "locality" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "locality_slug_key" ON "locality"("slug");
