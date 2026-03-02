-- AlterEnum
ALTER TYPE "TransactionIntent" ADD VALUE 'ADD_CARD';

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorization_code" TEXT NOT NULL,
    "card_type" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "exp_month" TEXT NOT NULL,
    "exp_year" TEXT NOT NULL,
    "bin" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "country_code" TEXT,
    "account_name" TEXT,
    "reusable" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_userId_idx" ON "Card"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_userId_signature_key" ON "Card"("userId", "signature");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
