
CREATE TYPE "TransactionDestination" AS ENUM ('WALLET', 'BANK_ACCOUNT', 'PLATFORM');

-- Add new nullable columns (expand – safe for existing rows)
ALTER TABLE "Transaction"
    ADD COLUMN "bank_id"     TEXT,
    ADD COLUMN "destination" "TransactionDestination",
    ADD COLUMN "reason"      TEXT;

-- CreateTable
CREATE TABLE "BankAccount" (
    "id"            TEXT         NOT NULL,
    "bankName"      TEXT         NOT NULL,
    "bankCode"      TEXT         NOT NULL,
    "accountNumber" TEXT         NOT NULL,
    "accountName"   TEXT         NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bank_id_fkey"
    FOREIGN KEY ("bank_id") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── STEP 2: BACKFILL ─────────────────────────────────────────
-- `destination` is new and always NULL — safe to set unconditionally.
-- `source` may already have a value — only fill it when it is NULL,
-- preserving any pre-existing data.

-- WALLET_TOPUP  → source: INSTANT_TRANSFER (if empty), destination: WALLET
UPDATE "Transaction"
SET
    "source"      = COALESCE("source", 'INSTANT_TRANSFER'::"TransactionSource"),
    "destination" = 'WALLET'::"TransactionDestination"
WHERE "intent" = 'WALLET_TOPUP';

-- BOOKING_PAYMENT → source: INSTANT_TRANSFER (if empty), destination: PLATFORM
UPDATE "Transaction"
SET
    "source"      = COALESCE("source", 'INSTANT_TRANSFER'::"TransactionSource"),
    "destination" = 'PLATFORM'::"TransactionDestination"
WHERE "intent" = 'BOOKING_PAYMENT';

-- BOOKING_CANCELLATION_FEE → source: PLATFORM (if empty), destination: WALLET
UPDATE "Transaction"
SET
    "source"      = COALESCE("source", 'PLATFORM'::"TransactionSource"),
    "destination" = 'WALLET'::"TransactionDestination"
WHERE "intent" = 'BOOKING_CANCELLATION_FEE';


-- ── STEP 3: CONTRACT ─────────────────────────────────────────
-- All rows now have values; tighten both columns to NOT NULL.

ALTER TABLE "Transaction"
    ALTER COLUMN "source"      SET NOT NULL,
    ALTER COLUMN "destination" SET NOT NULL;
