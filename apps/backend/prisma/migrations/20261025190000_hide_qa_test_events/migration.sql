-- QA on 24 October left four cancelled „TEST…“ events in the demo organizer's
-- Moje akce › Pořádám on staging. Hidden events are left out of the list, the
-- detail and Moje akce, and nothing is deleted. Only these four rows match, so
-- anywhere else this is a no-op.
UPDATE "event"
SET "status" = 'hidden'
WHERE "id" IN (
    'cmvmvrv2m00003itbtugcfu4q',
    'cmvmt4ann00003joj1p49fp2f',
    'cmvmthsco00013jmk8emwd9zk',
    'cmvmtht7r00033jmkteqzqz0n'
  )
  AND "title" LIKE 'TEST%'
  AND "status" = 'cancelled';
