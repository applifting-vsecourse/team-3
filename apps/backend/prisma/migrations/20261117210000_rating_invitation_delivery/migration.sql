-- Existing rows remain sent. New rows are pending until the mail transport succeeds.
ALTER TABLE "notification_log"
  ALTER COLUMN "sentAt" DROP NOT NULL,
  ALTER COLUMN "sentAt" DROP DEFAULT,
  ADD COLUMN "claimToken" TEXT,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Keep the same activation point across all instances and restarts.
CREATE TABLE "rating_invitation_schedule" (
  "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
  "activatedAt" TIMESTAMP(3) NOT NULL
);
INSERT INTO "rating_invitation_schedule" ("id", "activatedAt")
VALUES (1, CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
