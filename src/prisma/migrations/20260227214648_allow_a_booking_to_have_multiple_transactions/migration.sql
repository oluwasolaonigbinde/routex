-- ============================================================
-- EXPAND: add bookingId (nullable) to Transaction + FK
-- ============================================================

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "bookingId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- MIGRATE DATA: back-fill Transaction.bookingId from Booking.transactionId
-- ============================================================

UPDATE "Transaction" t
SET "bookingId" = b.id
FROM "Booking" b
WHERE b."transactionId" = t.id;

-- ============================================================
-- CONTRACT: drop transactionId from Booking + add refundedAt
-- ============================================================

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_transactionId_fkey";

-- DropIndex
DROP INDEX "Booking_transactionId_key";

-- AlterTable
ALTER TABLE "Booking"
    DROP COLUMN "transactionId",
    ADD COLUMN "refundedAt" TIMESTAMP(3);

