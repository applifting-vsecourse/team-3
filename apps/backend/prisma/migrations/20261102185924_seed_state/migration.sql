-- CreateTable
CREATE TABLE "seed_state" (
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_state_pkey" PRIMARY KEY ("key")
);
