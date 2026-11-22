-- Pozvánka od kamaráda (#406): a personal invite code per user, created on first use,
-- and who invited a new user (the inviter's count and the daily limit per code)
ALTER TABLE "user" ADD COLUMN "inviteCode" VARCHAR(32),
ADD COLUMN "invitedById" TEXT,
ADD COLUMN "invitedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "user_inviteCode_key" ON "user"("inviteCode");

-- CreateIndex
CREATE INDEX "user_invitedById_invitedAt_idx" ON "user"("invitedById", "invitedAt");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The inviter hears that somebody signed up through their link (#406, #86)
ALTER TYPE "notification_type" ADD VALUE 'friend_invite_joined';
