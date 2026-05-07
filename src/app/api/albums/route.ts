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
 *   sort  - "recent" | "name" (default "name")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const sort = searchParams.get("sort") ?? "name";

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
