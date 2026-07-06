/*
  Warnings:

  - You are about to drop the column `xSpaceUrl` on the `WallEvent` table. All the data in the column will be lost.
  - Added the required column `xAccount` to the `WallEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WallEvent" DROP COLUMN "xSpaceUrl",
ADD COLUMN     "xAccount" TEXT NOT NULL;
