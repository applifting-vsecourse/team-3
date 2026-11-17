-- Existing rows remain sent. New rows are pending until the mail transport succeeds.
ALTER TABLE "notification_log"
  ALTER COLUMN "sentAt" DROP NOT NULL,
  ALTER COLUMN "sentAt" DROP DEFAULT,
  ADD COLUMN "claimToken" TEXT,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);
