-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "boardingOpensAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Trip_status_boardingOpensAt_idx" ON "Trip"("status", "boardingOpensAt");
