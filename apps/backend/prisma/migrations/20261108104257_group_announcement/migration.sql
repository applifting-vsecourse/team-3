-- Oznámení správce členům skupiny (#194). Jen přidává novou tabulku.

-- CreateTable
CREATE TABLE "group_announcement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_announcement_groupId_createdAt_idx" ON "group_announcement"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "group_announcement" ADD CONSTRAINT "group_announcement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_announcement" ADD CONSTRAINT "group_announcement_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
