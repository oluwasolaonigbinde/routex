/*
  Warnings:

  - The values [PIN] on the enum `AuthorizationMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuthorizationMethod_new" AS ENUM ('PASSWORD', 'OTP', 'TOTP');
ALTER TABLE "Intent" ALTER COLUMN "requiredAuthMethods" TYPE "AuthorizationMethod_new"[] USING ("requiredAuthMethods"::text::"AuthorizationMethod_new"[]);
ALTER TABLE "AuthorizationAttempt" ALTER COLUMN "method" TYPE "AuthorizationMethod_new" USING ("method"::text::"AuthorizationMethod_new");
ALTER TYPE "AuthorizationMethod" RENAME TO "AuthorizationMethod_old";
ALTER TYPE "AuthorizationMethod_new" RENAME TO "AuthorizationMethod";
DROP TYPE "public"."AuthorizationMethod_old";
COMMIT;

-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "first_name" DROP NOT NULL,
ALTER COLUMN "last_name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "first_name" DROP NOT NULL,
ALTER COLUMN "last_name" DROP NOT NULL;
