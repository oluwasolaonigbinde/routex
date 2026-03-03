-- CreateTable
CREATE TABLE "FavoriteRoute" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FavoriteRoute_user_id_idx" ON "FavoriteRoute"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoute_user_id_route_id_key" ON "FavoriteRoute"("user_id", "route_id");

-- AddForeignKey
ALTER TABLE "FavoriteRoute" ADD CONSTRAINT "FavoriteRoute_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRoute" ADD CONSTRAINT "FavoriteRoute_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
