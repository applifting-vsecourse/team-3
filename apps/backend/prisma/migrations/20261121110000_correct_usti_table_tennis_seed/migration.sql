-- Repair the original demo venue in place so its event ID and relations survive.
-- The seed-owned IDs and original venue guard exclude user-created or edited venues.
UPDATE "event" AS event
SET
    "address" = 'Tělocvična gymnázia, T. G. Masaryka 106, Ústí nad Orlicí',
    "lat" = 49.971691,
    "lng" = 16.396996,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "seed_state" AS seed, "locality" AS locality
WHERE seed."key" = 'demo'
    AND event."id" = ANY(seed."eventIds")
    AND event."localityId" = locality."id"
    AND locality."slug" = 'usti-nad-orlici'
    AND event."title" = 'Stolní tenis s TJ Jiskra'
    AND event."address" = 'Tělocvična gymnázia, Heranova 1424, Ústí nad Orlicí'
    AND event."lat" = 49.9737
    AND event."lng" = 16.3836;
