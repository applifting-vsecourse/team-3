-- PO 26. 11.: an upozornění „… ti posílá žádost o přátelství“ whose request was already
-- accepted, rejected or cancelled led to an empty list of requests. From now on the request
-- takes it along when decided (FriendshipRepository); this removes the ones left before.
DELETE FROM "notification" AS n
WHERE n."type" = 'friend_request'
  AND NOT EXISTS (
    SELECT 1
    FROM "friendship" AS f
    WHERE f."requesterId" = n."targetId"
      AND f."addresseeId" = n."userId"
      AND f."status" = 'pending'
  );
