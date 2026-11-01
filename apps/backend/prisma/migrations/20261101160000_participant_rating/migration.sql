-- Hodnocení účastníka organizátorem (#180, B-060).

-- CreateTable
CREATE TABLE "participant_rating" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participant_rating_participantId_idx" ON "participant_rating"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "participant_rating_eventId_participantId_key" ON "participant_rating"("eventId", "participantId");

-- AddForeignKey
ALTER TABLE "participant_rating" ADD CONSTRAINT "participant_rating_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_rating" ADD CONSTRAINT "participant_rating_eventId_participantId_fkey" FOREIGN KEY ("eventId", "participantId") REFERENCES "participation"("eventId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hvězdičky 1–5 hlídá i databáze. Prisma CHECK ve schématu neumí zapsat, a proto ho
-- při dalších migracích ani nesmaže (prisma migrate diff ho nevidí).
ALTER TABLE "participant_rating" ADD CONSTRAINT "participant_rating_stars_check" CHECK ("stars" BETWEEN 1 AND 5);
