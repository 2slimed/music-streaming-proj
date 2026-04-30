import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/search?q=<query>&type=tracks|playlists|all
 * Full-text-style search across tracks & public playlists.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim();
    const type = searchParams.get("type") ?? "all";
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    if (!q) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const results: Record<string, unknown> = {};

    if (type === "all" || type === "tracks") {
      results.tracks = await prisma.track.findMany({
        where: {
          OR: [
            { trackName: { contains: q, mode: "insensitive" } },
            { artists: { contains: q, mode: "insensitive" } },
            { albumName: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { popularity: "desc" },
        take: limit,
      });
    }

    if (type === "all" || type === "playlists") {
      results.playlists = await prisma.playlist.findMany({
        where: {
          privacy: "PUBLIC",
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { tracks: true } },
        },
        take: limit,
      });
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
