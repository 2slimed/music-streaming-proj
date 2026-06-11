import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireAdmin } from "@/lib/authz";
import type { ModerationStatus } from "@/generated/prisma/client";

const STATUSES: ModerationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (isAuthResponse(admin)) return admin;

  try {
    const status = request.nextUrl.searchParams.get("status");
    const tracks = await prisma.track.findMany({
      where: STATUSES.includes(status as ModerationStatus)
        ? { moderationStatus: status as ModerationStatus }
        : { submittedById: { not: null } },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true, role: true } },
        artistOwner: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ data: tracks });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (isAuthResponse(admin)) return admin;

  try {
    const body = await request.json();
    if (typeof body.trackId !== "string" || !body.trackId) {
      return NextResponse.json({ error: "trackId is required" }, { status: 400 });
    }
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const track = await prisma.track.update({
      where: { id: body.trackId },
      data: { moderationStatus: body.status },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true, role: true } },
        artistOwner: true,
      },
    });

    if (body.status === "APPROVED") {
      const existingAlbum = await prisma.album.findFirst({
        where: { name: track.albumName, artists: track.artists },
      });
      if (!existingAlbum) {
        await prisma.album.create({
          data: {
            name: track.albumName,
            artists: track.artists,
            coverUrl: track.coverUrl,
          },
        });
      }
    }

    return NextResponse.json(track);
  } catch {
    return NextResponse.json({ error: "Failed to update track" }, { status: 500 });
  }
}
