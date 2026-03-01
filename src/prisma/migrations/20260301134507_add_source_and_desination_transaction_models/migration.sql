-- ============================================================
-- EXPAND & CONTRACT MIGRATION
-- ============================================================
ALTER TYPE "TransactionIntent" ADD VALUE IF NOT EXISTS 'BOOKING_CANCELLATION_FEE';
ALTER TYPE "TransactionSource" ADD VALUE IF NOT EXISTS 'PLATFORM';
-- ── STEP 1a: ADD ENUM VALUES ─────────────────────────────────
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction
-- as DML that references the new values (PostgreSQL limitation).
-- We commit Prisma's wrapping transaction immediately after these
-- two statements so the new values are visible to everything below.
