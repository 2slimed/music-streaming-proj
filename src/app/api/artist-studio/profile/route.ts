import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireRole } from "@/lib/authz";
import { getHttpsUrlError } from "@/lib/validation";

export async function PATCH(request: Request) {
  const user = await requireRole(["ARTIST", "ADMIN"]);
  if (isAuthResponse(user)) return user;

  try {
    const body = await request.json();
    if (typeof body.artistId !== "string" || !body.artistId) {
      return NextResponse.json({ error: "artistId is required" }, { status: 400 });
    }

    const claim = await prisma.artistClaim.findFirst({
      where: {
        userId: user.id,
        artistId: body.artistId,
        status: "APPROVED",
      },
    });
    if (!claim && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: { bio?: string | null; imageUrl?: string | null } = {};
    if (body.bio !== undefined) {
      if (body.bio !== null && typeof body.bio !== "string") {
        return NextResponse.json({ error: "bio must be a string or null" }, { status: 400 });
      }
      data.bio = body.bio?.trim() || null;
    }
    if (body.imageUrl !== undefined) {
      const error = getHttpsUrlError(body.imageUrl, "imageUrl");
      if (error) return NextResponse.json({ error }, { status: 400 });
      data.imageUrl = body.imageUrl?.trim() || null;
    }

    const artist = await prisma.artist.update({
      where: { id: body.artistId },
      data,
    });

    return NextResponse.json(artist);
  } catch {
    return NextResponse.json({ error: "Failed to update artist profile" }, { status: 500 });
  }
}
