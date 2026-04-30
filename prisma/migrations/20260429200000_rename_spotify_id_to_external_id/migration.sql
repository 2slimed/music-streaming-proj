-- Rename spotifyId column to externalId
ALTER TABLE "Track" RENAME COLUMN "spotifyId" TO "externalId";

-- Drop old unique index and create new one
DROP INDEX "Track_spotifyId_key";
CREATE UNIQUE INDEX "Track_externalId_key" ON "Track"("externalId");
