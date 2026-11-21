BEGIN;

ALTER TABLE "user" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Only newly registered users enter the wizard. Existing accounts already
-- went through their first sign-in under the previous flow.
UPDATE "user" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP;

COMMIT;
