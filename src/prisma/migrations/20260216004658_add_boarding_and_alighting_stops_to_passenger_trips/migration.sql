/*
  Warnings:

  - Added the required column `alightingStopId` to the `PassengerTrip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `boardingStopId` to the `PassengerTrip` table without a default value. This is not possible if the table is not empty.

*/

-- EXPAND PHASE: Add new columns as nullable
ALTER TABLE "PassengerTrip" ADD COLUMN "boardingStopId" TEXT;
ALTER TABLE "PassengerTrip" ADD COLUMN "alightingStopId" TEXT;

-- MIGRATE PHASE: Copy data from Booking to PassengerTrip through Passenger relationship
-- Use boardingStopId from Booking if available, otherwise use Route's startLocationId
-- Use alightingStopId from Booking if available, otherwise use Route's endLocationId
UPDATE "PassengerTrip" pt
SET 
    "boardingStopId" = COALESCE(b."boardingStopId", r."startLocationId"),
    "alightingStopId" = COALESCE(b."alightingStopId", r."endLocationId")
FROM "Passenger" p
JOIN "Booking" b ON p."bookingId" = b.id
JOIN "Trip" t ON b."outboundTripId" = t.id
JOIN "Route" r ON t."routeId" = r.id
WHERE pt."passengerId" = p.id;

-- CONTRACT PHASE: Make columns required and add foreign key constraints
ALTER TABLE "PassengerTrip" ALTER COLUMN "boardingStopId" SET NOT NULL;
ALTER TABLE "PassengerTrip" ALTER COLUMN "alightingStopId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "PassengerTrip" ADD CONSTRAINT "PassengerTrip_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerTrip" ADD CONSTRAINT "PassengerTrip_alightingStopId_fkey" FOREIGN KEY ("alightingStopId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
