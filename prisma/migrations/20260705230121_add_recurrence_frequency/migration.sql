-- AlterTable
ALTER TABLE "WallEvent" ADD COLUMN     "recurrenceFrequency" TEXT;

-- Backfill existing recurring events so they keep showing as weekly.
UPDATE "WallEvent" SET "recurrenceFrequency" = 'weekly' WHERE "recurring" = true;
