-- CreateEnum
CREATE TYPE "AuthorizationAttemptStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "IntentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'EXECUTED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Tenant" AS ENUM ('USER');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "IntentType" AS ENUM ('EMPTY');

-- CreateEnum
CREATE TYPE "AuthorizationMethod" AS ENUM ('PIN', 'PASSWORD', 'OTP', 'TOTP');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_photo_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "tenant" "Tenant" NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "require_2fa" BOOLEAN NOT NULL DEFAULT false,
    "require_email_verification" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "phone" TEXT,
    "referral_code" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "credential_status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_reset_required" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "two_factor_method" TEXT,
    "locked_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "suspend_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "lock_expires_at" TIMESTAMP(3),
    "pin" TEXT,
    "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "pin_locked_until" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL,
    "tenant" "Tenant" NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "require_2fa" BOOLEAN NOT NULL DEFAULT false,
    "require_email_verification" BOOLEAN NOT NULL DEFAULT false,
    "credential_status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_reset_required" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "two_factor_method" TEXT,
    "locked_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "lock_expires_at" TIMESTAMP(3),

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT,

    CONSTRAINT "BackupCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "device_name" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "IntentType" NOT NULL,
    "status" "IntentStatus" NOT NULL DEFAULT 'CREATED',
    "payload" JSONB NOT NULL,
    "meta" JSONB,
    "requiredAuthMethods" "AuthorizationMethod"[],
    "minAuthSatisfied" INTEGER NOT NULL,
    "authorizedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizationAttempt" (
    "id" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "method" "AuthorizationMethod" NOT NULL,
    "status" "AuthorizationAttemptStatus" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "AuthorizationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_key" ON "Session"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_hash_key" ON "Session"("token_hash");

-- CreateIndex
CREATE INDEX "Intent_userId_idx" ON "Intent"("userId");

-- CreateIndex
CREATE INDEX "Intent_status_idx" ON "Intent"("status");

-- CreateIndex
CREATE INDEX "Intent_expiresAt_idx" ON "Intent"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthorizationAttempt_intentId_idx" ON "AuthorizationAttempt"("intentId");

-- CreateIndex
CREATE INDEX "AuthorizationAttempt_intentId_method_idx" ON "AuthorizationAttempt"("intentId", "method");

-- AddForeignKey
ALTER TABLE "BackupCode" ADD CONSTRAINT "BackupCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupCode" ADD CONSTRAINT "BackupCode_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizationAttempt" ADD CONSTRAINT "AuthorizationAttempt_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "Intent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
