-- ============================================================
-- EXPAND: add columns as nullable so existing rows are safe
-- ============================================================
ALTER TABLE "Trip" ADD COLUMN "startLocationId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "endLocationId"   TEXT;

-- ============================================================
-- BACKFILL: copy start/end location from the related Route
-- ============================================================
UPDATE "Trip" t
SET
    "startLocationId" = r."startLocationId",
    "endLocationId"   = r."endLocationId"
FROM "Route" r
WHERE t."routeId" = r."id";

-- ============================================================
-- CONTRACT: enforce NOT NULL now that every row is populated
-- ============================================================
ALTER TABLE "Trip" ALTER COLUMN "startLocationId" SET NOT NULL;
ALTER TABLE "Trip" ALTER COLUMN "endLocationId"   SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_startLocationId_fkey" FOREIGN KEY ("startLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_endLocationId_fkey" FOREIGN KEY ("endLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
