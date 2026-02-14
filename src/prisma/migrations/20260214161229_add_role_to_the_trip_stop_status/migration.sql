/*
  Warnings:

  - You are about to drop the column `creationMode` on the `TripSchedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TripSchedule" DROP COLUMN "creationMode";

-- AlterTable
ALTER TABLE "TripStopStatus" ADD COLUMN     "role" "StopRole" NOT NULL DEFAULT 'PICKUP_AND_DROPOFF';

-- DropEnum
DROP TYPE "TripCreationMode";
