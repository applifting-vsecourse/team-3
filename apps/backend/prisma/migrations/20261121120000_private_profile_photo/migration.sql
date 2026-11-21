CREATE TABLE "profile_photo" (
    "userId" TEXT NOT NULL,
    "version" UUID NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "profile_photo_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "profile_photo_size" CHECK (octet_length("data") BETWEEN 1 AND 5242880)
);

ALTER TABLE "profile_photo"
    ADD CONSTRAINT "profile_photo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
