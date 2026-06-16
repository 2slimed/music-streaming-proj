import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireAdmin } from "@/lib/authz";

export async function GET() {
  const user = await requireAdmin();
  if (isAuthResponse(user)) return user;

  try {
    const [
      users,
      artists,
      tracks,
      playlists,
      pendingArtistClaims,
      pendingTrackSubmissions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.artist.count(),
      prisma.track.count(),
      prisma.playlist.count(),
      prisma.artistClaim.count({ where: { status: "PENDING" } }),
      prisma.track.count({ where: { moderationStatus: "PENDING" } }),
    ]);

    return NextResponse.json({
      users,
      artists,
      tracks,
      playlists,
      pendingArtistClaims,
      pendingTrackSubmissions,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch admin summary" }, { status: 500 });
  }
}
