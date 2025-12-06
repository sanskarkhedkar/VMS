-- AlterTable
ALTER TABLE "Visit" ADD COLUMN "guestDetails" JSONB;
ALTER TABLE "Visit" ALTER COLUMN "numberOfGuests" SET DEFAULT 0;
