import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireRole } from "@/lib/authz";

export async function GET() {
  const user = await requireRole(["ARTIST", "ADMIN"]);
  if (isAuthResponse(user)) return user;

  try {
    const claims = await prisma.artistClaim.findMany({
      where: { userId: user.id },
      include: { artist: true },
      orderBy: { updatedAt: "desc" },
    });

    const approvedArtistIds = claims
      .filter((claim) => claim.status === "APPROVED")
      .map((claim) => claim.artistId);

    const ownedTracks = approvedArtistIds.length
      ? await prisma.track.findMany({
          where: {
            moderationStatus: "APPROVED",
            OR: [
              { artistOwnerId: { in: approvedArtistIds } },
              ...claims
                .filter((claim) => claim.status === "APPROVED")
                .map((claim) => ({
                  artists: { contains: claim.artist.name, mode: "insensitive" as const },
                })),
            ],
          },
          select: { id: true, popularity: true },
        })
      : [];

    const trackIds = ownedTracks.map((track) => track.id);
    const [likes, playlistAdds, pendingTracks] = await Promise.all([
      trackIds.length
        ? prisma.libraryItem.count({ where: { trackId: { in: trackIds } } })
        : 0,
      trackIds.length
        ? prisma.playlistTrack.count({ where: { trackId: { in: trackIds } } })
        : 0,
      prisma.track.count({
        where: { submittedById: user.id, moderationStatus: "PENDING" },
      }),
    ]);

    const averagePopularity =
      ownedTracks.length === 0
        ? 0
        : Math.round(
            ownedTracks.reduce((sum, track) => sum + track.popularity, 0) /
              ownedTracks.length,
          );

    return NextResponse.json({
      claims,
      approvedArtists: claims
        .filter((claim) => claim.status === "APPROVED")
        .map((claim) => claim.artist),
      stats: {
        tracks: ownedTracks.length,
        likes,
        playlistAdds,
        pendingTracks,
        averagePopularity,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch artist studio summary" },
      { status: 500 },
    );
  }
}
