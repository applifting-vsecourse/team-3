-- „Parťáci v okolí“ on the landing page (#474): the frequency cap lives on the server.
-- A visit to /partaci hides the block for 7 days, „Skrýt“ for 30 days.
ALTER TABLE "user" ADD COLUMN "partnersVisitedAt" TIMESTAMP(3),
ADD COLUMN "partnersHomeHiddenUntil" TIMESTAMP(3);
