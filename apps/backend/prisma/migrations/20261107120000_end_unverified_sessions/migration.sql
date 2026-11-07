-- #236 (S-5): only a verified e-mail signs in now. Sessions of users whose
-- e-mail isn't verified end, so nobody stays signed in unverified from before
-- the change: signing in again shows „Ověř si e-mail“ with a new link.
-- No schema change; with no such sessions this is a no-op.
DELETE FROM "session"
WHERE "userId" IN (
    SELECT "id"
    FROM "user"
    WHERE "emailVerified" = false
  );
