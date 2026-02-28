/*
  Warnings:

  - Added the required column `pricePerSeat` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PassengerTripStatus" AS ENUM ('RESERVED', 'SCHEDULED', 'BOARDED', 'ALIGHTED', 'NO_SHOW', 'CANCELLED');

-- DropIndex
DROP INDEX "PassengerTrip_boardingToken_key";

-- AlterTable: EXPAND - add pricePerSeat as nullable first
ALTER TABLE "Booking" ADD COLUMN "pricePerSeat" INTEGER;

-- BACKFILL - derive pricePerSeat from totalPrice divided by passenger count
UPDATE "Booking" b
SET "pricePerSeat" = b."totalPrice" / GREATEST(
    (SELECT COUNT(*) FROM "Passenger" p WHERE p."bookingId" = b.id),
    1
);

-- CONTRACT - now that all rows are populated, enforce NOT NULL
ALTER TABLE "Booking" ALTER COLUMN "pricePerSeat" SET NOT NULL;

-- AlterTable
ALTER TABLE "PassengerTrip" ADD COLUMN     "status" "PassengerTripStatus" NOT NULL DEFAULT 'RESERVED',
ALTER COLUMN "boardingToken" DROP NOT NULL;
