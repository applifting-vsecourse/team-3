/*
  Warnings:

  - You are about to drop the `quack` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "quack" DROP CONSTRAINT "quack_userId_fkey";

-- DropTable
DROP TABLE "quack";
