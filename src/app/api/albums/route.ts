import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/albums
 * List albums with optional pagination.
 *
 * Query params:
 *   page  - page number (default 1)
 *   limit - items per page (default 20, max 100)
 *   sort  - "recent" | "popular" | "name" (default "name")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const sort = searchParams.get("sort") ?? "name";

    // Popular sort: rank albums by average track popularity (derived from tracks)
    if (sort === "popular") {
      const albums = await prisma.album.findMany();

      const trackAggs = await prisma.track.groupBy({
        by: ["albumName", "artists"],
        _avg: { popularity: true },
      });

      const popMap = new Map<string, number>();
      for (const agg of trackAggs) {
        const key = agg.albumName + "|||" + agg.artists;
        popMap.set(key, Math.round(agg._avg.popularity ?? 0));
      }

      albums.sort((a, b) => {
        const popA = popMap.get(a.name + "|||" + a.artists) ?? 0;
        const popB = popMap.get(b.name + "|||" + b.artists) ?? 0;
        return popB - popA;
      });

      const total = albums.length;
      const paginated = albums.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        data: paginated,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    const orderBy =
      sort === "recent"
        ? { createdAt: "desc" as const }
        : { name: "asc" as const };

    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.album.count(),
    ]);

    return NextResponse.json({
      data: albums,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 },
    );
  }
}
