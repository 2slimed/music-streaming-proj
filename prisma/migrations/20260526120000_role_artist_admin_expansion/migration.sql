-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LISTENER', 'ARTIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'LISTENER';

-- AlterTable
ALTER TABLE "Track"
  ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "submittedById" TEXT,
  ADD COLUMN "artistOwnerId" TEXT;

-- CreateTable
CREATE TABLE "ArtistClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_moderationStatus_idx" ON "Track"("moderationStatus");

-- CreateIndex
CREATE INDEX "Track_submittedById_idx" ON "Track"("submittedById");

-- CreateIndex
CREATE INDEX "Track_artistOwnerId_idx" ON "Track"("artistOwnerId");

-- CreateIndex
CREATE INDEX "ArtistClaim_userId_idx" ON "ArtistClaim"("userId");

-- CreateIndex
CREATE INDEX "ArtistClaim_artistId_idx" ON "ArtistClaim"("artistId");

-- CreateIndex
CREATE INDEX "ArtistClaim_status_idx" ON "ArtistClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistClaim_userId_artistId_key" ON "ArtistClaim"("userId", "artistId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_artistOwnerId_fkey" FOREIGN KEY ("artistOwnerId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistClaim" ADD CONSTRAINT "ArtistClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistClaim" ADD CONSTRAINT "ArtistClaim_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
