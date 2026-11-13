-- Hodnocení akce a organizátora (`rating`) hlídá databáze stejně jako hodnocení účastníka
-- (`participant_rating`, #180): hvězdičky 1–5 a komentář nejvýš 500 znaků (review #313, #66, B-060).
--
-- Stávající data: API hvězdičky 1–5 a komentář do 500 znaků hlídá od #66, seed taky. Delší
-- komentář by migraci zastavil chybou ("value too long"), neořízl by se – nic se tiše neztratí.

-- AlterTable
ALTER TABLE "rating" ALTER COLUMN "comment" SET DATA TYPE VARCHAR(500);

-- Hvězdičky 1–5. Prisma CHECK ve schématu neumí zapsat, a proto ho při dalších migracích ani
-- nesmaže (prisma migrate diff ho nevidí).
ALTER TABLE "rating" ADD CONSTRAINT "rating_eventStars_check" CHECK ("eventStars" BETWEEN 1 AND 5);
ALTER TABLE "rating" ADD CONSTRAINT "rating_organizerStars_check" CHECK ("organizerStars" BETWEEN 1 AND 5);
