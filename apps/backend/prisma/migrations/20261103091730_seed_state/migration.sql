-- CreateTable
CREATE TABLE "seed_state" (
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "eventIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "groupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_state_pkey" PRIMARY KEY ("key")
);
