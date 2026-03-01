/*
  Expand and Contract Pattern Migration:
  
  1. EXPAND: Add new enum values (CANCELLED to BookingStatus, COMPLETED to PassengerTripStatus)
  2. MIGRATE: Update existing data (REFUNDED -> CANCELLED, ALIGHTED -> COMPLETED)
  3. CONTRACT: Remove old enum values (REFUNDED, ALIGHTED)
  4. Add reservationExpiresAt column with default value from createdAt
*/

-- ========================================
-- PHASE 1: EXPAND - Add new enum values
-- ========================================

-- Migrate REFUNDED bookings to CANCELLED
UPDATE "Booking" 
SET "status" = 'CANCELLED'::"BookingStatus" 
WHERE "status" = 'REFUNDED'::"BookingStatus";

-- Remove REFUNDED from BookingStatus
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- ========================================
-- PHASE 3: CONTRACT - Remove old enum values
-- ========================================

-- ========================================
-- PHASE 3: Add reservationExpiresAt column
-- ========================================

-- Add reservationExpiresAt column, defaulting to createdAt for existing records
ALTER TABLE "Booking" ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

-- Set reservationExpiresAt to createdAt for existing records
UPDATE "Booking" SET "reservationExpiresAt" = "createdAt" WHERE "reservationExpiresAt" IS NULL;

-- Make the column NOT NULL now that all records have values
ALTER TABLE "Booking" ALTER COLUMN "reservationExpiresAt" SET NOT NULL;



-- Remove ALIGHTED from PassengerTripStatus
BEGIN;
CREATE TYPE "PassengerTripStatus_new" AS ENUM ('RESERVED', 'SCHEDULED', 'BOARDED', 'ALIGHTED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
ALTER TABLE "PassengerTrip" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PassengerTrip" ALTER COLUMN "status" TYPE "PassengerTripStatus_new" USING ("status"::text::"PassengerTripStatus_new");
ALTER TYPE "PassengerTripStatus" RENAME TO "PassengerTripStatus_old";
ALTER TYPE "PassengerTripStatus_new" RENAME TO "PassengerTripStatus";
DROP TYPE "PassengerTripStatus_old";
ALTER TABLE "PassengerTrip" ALTER COLUMN "status" SET DEFAULT 'RESERVED';
COMMIT;

