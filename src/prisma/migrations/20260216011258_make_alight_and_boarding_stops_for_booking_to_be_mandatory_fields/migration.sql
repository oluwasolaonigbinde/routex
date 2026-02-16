/*
  Warnings:

  - Made the column `boardingStopId` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `alightingStopId` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/

-- MIGRATE PHASE: Fill in NULL values using the outbound trip's route start/end locations
UPDATE "Booking" b
SET 
    "boardingStopId" = r."startLocationId"
FROM "Trip" t
JOIN "Route" r ON t."routeId" = r.id
WHERE b."outboundTripId" = t.id
  AND b."boardingStopId" IS NULL;

UPDATE "Booking" b
SET 
    "alightingStopId" = r."endLocationId"
FROM "Trip" t
JOIN "Route" r ON t."routeId" = r.id
WHERE b."outboundTripId" = t.id
  AND b."alightingStopId" IS NULL;

-- CONTRACT PHASE: Make columns required
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_alightingStopId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_boardingStopId_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "boardingStopId" SET NOT NULL,
ALTER COLUMN "alightingStopId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_alightingStopId_fkey" FOREIGN KEY ("alightingStopId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
