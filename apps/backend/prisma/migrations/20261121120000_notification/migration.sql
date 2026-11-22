-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('request_received', 'participant_joined', 'participant_left', 'request_approved', 'request_rejected', 'event_changed', 'event_cancelled', 'event_message', 'group_announcement', 'group_join_request', 'group_request_approved', 'group_request_rejected', 'friend_request', 'friend_accepted');

-- CreateEnum
CREATE TYPE "notification_target_type" AS ENUM ('event', 'group', 'user');

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "targetType" "notification_target_type" NOT NULL,
    "targetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

