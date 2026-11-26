-- PO 26. 11.: maximum is optional, null = no limit
ALTER TABLE "event" ALTER COLUMN "maxParticipants" DROP NOT NULL;
