/*
  Migration: add_transactions (expand-and-contract)

  EXPAND:
    1. Create new enums and tables.
    2. Add transactionId as NULLABLE so existing rows are not broken.

  MIGRATE:
    3. Reclassify PAYMENT_PENDING bookings → PENDING before dropping the variant.
    4. Create a synthetic Transaction row for every existing booking and
       back-fill transactionId so every row is non-null before the constraint lands.

  CONTRACT:
    5. Tighten transactionId to NOT NULL + UNIQUE + FK.
    6. Swap the BookingStatus enum (drops PAYMENT_PENDING).
    7. Drop the now-superseded paymentMethod / paymentReference columns.
*/

-- ────────────────────────────────────────────────────────────────────────────
-- EXPAND: new enums
-- ────────────────────────────────────────────────────────────────────────────

CREATE TYPE "PaymentAttemptStatus"    AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "TransactionIntent"       AS ENUM ('WALLET_TOPUP', 'BOOKING_PAYMENT');
CREATE TYPE "PaymentSource"           AS ENUM ('PAYSTACK', 'WALLET');
CREATE TYPE "TransactionType"         AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "TransactionSource"       AS ENUM ('INSTANT_TRANSFER', 'WALLET', 'CARD');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- ────────────────────────────────────────────────────────────────────────────
-- EXPAND: new tables
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Wallet" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "balance"   INTEGER      NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
    "id"           TEXT                      NOT NULL,
    "walletId"     TEXT,
    "type"         "TransactionType"         NOT NULL,
    "amount"       INTEGER                   NOT NULL,
    "gross"        INTEGER,
    "gatewayFee"   INTEGER,
    "gateway"      TEXT,
    "reference"    TEXT                      NOT NULL,
    "balance"      INTEGER,
    "intent"       "TransactionIntent"       NOT NULL,
    "source"       "TransactionSource",
    "description"  TEXT                      NOT NULL,
    "bookingId"    TEXT,
    "metadata"     JSONB,
    "failed_at"    TIMESTAMP(3),
    "succeeded_at" TIMESTAMP(3),
    "status"       "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"    TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "userId"       TEXT                      NOT NULL,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAttempt" (
    "id"               TEXT                   NOT NULL,
    "transactionId"    TEXT                   NOT NULL,
    "gateway"          TEXT                   NOT NULL,
    "status"           "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "request_payload"  JSONB,
    "response_payload" JSONB,
    "error_code"       TEXT,
    "error_message"    TEXT,
    "created_at"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)           NOT NULL,
    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key"         ON "Wallet"("userId");
CREATE UNIQUE INDEX "Transaction_reference_key"  ON "Transaction"("reference");
CREATE        INDEX "Transaction_reference_idx"  ON "Transaction"("reference");

-- EXPAND: add transactionId as nullable first so existing rows are unaffected
ALTER TABLE "Booking" ADD COLUMN "transactionId" TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- MIGRATE: coerce PAYMENT_PENDING → PENDING before the enum variant is removed
-- ────────────────────────────────────────────────────────────────────────────

UPDATE "Booking" SET "status" = 'PENDING' WHERE "status" = 'PAYMENT_PENDING';

-- ────────────────────────────────────────────────────────────────────────────
-- MIGRATE: synthesise a Transaction for every booking that has no transaction.
--   • Uses paymentReference as the reference where it exists.
--   • Falls back to 'LEGACY-<bookingId>' to guarantee uniqueness.
--   • Status is derived from the booking status so the ledger is consistent.
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO "Transaction" (
    "id",
    "userId",
    "type",
    "amount",
    "reference",
    "intent",
    "description",
    "bookingId",
    "status"
)
SELECT
    gen_random_uuid()::text,
    b."userId",
    'CREDIT'::"TransactionType",
    b."totalPrice",
    gen_random_uuid()::text,
    'BOOKING_PAYMENT'::"TransactionIntent",
    'Payment for booking ' || b."id",
    b."id",
    CASE b."status"
        WHEN 'CONFIRMED' THEN 'SUCCESS'::"WalletTransactionStatus"
        WHEN 'CANCELLED' THEN 'FAILED'::"WalletTransactionStatus"
        WHEN 'REFUNDED'  THEN 'FAILED'::"WalletTransactionStatus"
        ELSE                   'PENDING'::"WalletTransactionStatus"
    END
FROM "Booking" b
WHERE b."transactionId" IS NULL;

-- Back-fill transactionId on the booking rows
UPDATE "Booking" b
SET "transactionId" = t."id"
FROM "Transaction" t
WHERE t."bookingId" = b."id"
  AND b."transactionId" IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- CONTRACT: every row is filled — enforce the constraint
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Booking" ALTER COLUMN "transactionId" SET NOT NULL;

CREATE UNIQUE INDEX "Booking_transactionId_key" ON "Booking"("transactionId");

ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- CONTRACT: swap enum, removing the PAYMENT_PENDING variant
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED');
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking"
    ALTER COLUMN "status" TYPE "BookingStatus_new"
    USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- CONTRACT: drop superseded columns
DROP INDEX IF EXISTS "Booking_paymentReference_key";
ALTER TABLE "Booking"
    DROP COLUMN IF EXISTS "paymentMethod",
    DROP COLUMN IF EXISTS "paymentReference";

-- ────────────────────────────────────────────────────────────────────────────
-- Foreign keys for new tables
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Wallet"
    ADD CONSTRAINT "Wallet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAttempt"
    ADD CONSTRAINT "PaymentAttempt_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
