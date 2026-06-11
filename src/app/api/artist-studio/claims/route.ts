import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireUser } from "@/lib/authz";

export async function GET() {
  const user = await requireUser();
  if (isAuthResponse(user)) return user;

  try {
    const claims = await prisma.artistClaim.findMany({
      where: { userId: user.id },
      include: { artist: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: claims });
  } catch {
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (isAuthResponse(user)) return user;

  try {
    const body = await request.json();
    if (typeof body.artistId !== "string" || !body.artistId) {
      return NextResponse.json({ error: "artistId is required" }, { status: 400 });
    }
    if (body.note !== undefined && typeof body.note !== "string") {
      return NextResponse.json({ error: "note must be a string" }, { status: 400 });
    }

    const artist = await prisma.artist.findUnique({ where: { id: body.artistId } });
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const claim = await prisma.artistClaim.upsert({
      where: { userId_artistId: { userId: user.id, artistId: artist.id } },
      update: {
        status: "PENDING",
        note: body.note?.trim() || null,
      },
      create: {
        userId: user.id,
        artistId: artist.id,
        note: body.note?.trim() || null,
      },
      include: { artist: true },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit artist claim" }, { status: 500 });
  }
}
