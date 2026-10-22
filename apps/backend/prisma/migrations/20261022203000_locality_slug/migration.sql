-- Locality.name is not unique (several villages share a name), so the seed
-- matches localities by a stable slug instead.

-- AlterTable
ALTER TABLE "locality" ADD COLUMN "slug" TEXT;

-- Backfill existing rows with the same slugs the seed uses ("Praha 1" -> "praha-1",
-- "Ústí nad Labem" -> "usti-nad-labem"), so the seed upserts them instead of
-- creating duplicates. translate() covers Czech and Slovak letters only (no
-- unaccent extension on every host); toSlug() in catalog.service.ts is the same rule.
-- If a name is duplicated, the row with the lowest id keeps the plain slug and the
-- others get their id appended. The previous seed matched by name, so seeded
-- databases have no duplicates.
WITH slugged AS (
  SELECT
    "id",
    trim(BOTH '-' FROM regexp_replace(
      lower(translate("name",
        'áäčďéěëíĺľňóôöŕřšťúůüýžÁÄČĎÉĚËÍĹĽŇÓÔÖŔŘŠŤÚŮÜÝŽ',
        'aacdeeeillnooorrstuuuyzAACDEEEILLNOOORRSTUUUYZ')),
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
