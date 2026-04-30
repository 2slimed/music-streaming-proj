import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/profile/recent-plays
 * Returns the authenticated user's recent play history.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    const recentPlays = await prisma.recentPlay.findMany({
      where: { userId: session.user.id },
      include: { track: true },
      orderBy: { playedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: recentPlays });
  } catch {
    return NextResponse.json({ error: "Failed to fetch recent plays" }, { status: 500 });
  }
}
