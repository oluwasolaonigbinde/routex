/*
  Warnings:

  - The values [ALIGHTED] on the enum `PassengerTripStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum

-- Migrate ALIGHTED passenger trips to COMPLETED
UPDATE "PassengerTrip" 
SET "status" = 'COMPLETED'::"PassengerTripStatus" 
WHERE "status" = 'ALIGHTED'::"PassengerTripStatus";

BEGIN;
CREATE TYPE "PassengerTripStatus_new" AS ENUM ('RESERVED', 'SCHEDULED', 'BOARDED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
ALTER TABLE "public"."PassengerTrip" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PassengerTrip" ALTER COLUMN "status" TYPE "PassengerTripStatus_new" USING ("status"::text::"PassengerTripStatus_new");
ALTER TYPE "PassengerTripStatus" RENAME TO "PassengerTripStatus_old";
ALTER TYPE "PassengerTripStatus_new" RENAME TO "PassengerTripStatus";
DROP TYPE "public"."PassengerTripStatus_old";
ALTER TABLE "PassengerTrip" ALTER COLUMN "status" SET DEFAULT 'RESERVED';
COMMIT;
