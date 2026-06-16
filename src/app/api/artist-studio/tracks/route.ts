import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireRole } from "@/lib/authz";
import { getHttpsUrlError } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

function normalizedFeatures(input: {
  popularity: number;
  durationMs: number;
  explicit: boolean;
  danceability: number;
  energy: number;
}) {
  return {
    popularityNorm: input.popularity / 100,
    durationMsNorm: Math.min(input.durationMs / 600_000, 1),
    explicitNorm: input.explicit ? 1 : 0,
    danceabilityNorm: input.danceability,
    energyNorm: input.energy,
  };
}

function parseNumber(value: unknown, field: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { error: `${field} must be between ${min} and ${max}` };
  }
  return { value: parsed };
}

export async function GET(request: NextRequest) {
  const user = await requireRole(["ARTIST", "ADMIN"]);
  if (isAuthResponse(user)) return user;

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const where: Prisma.TrackWhereInput = {
      submittedById: user.id,
      ...(status === "PENDING" || status === "APPROVED" || status === "REJECTED"
        ? { moderationStatus: status }
        : {}),
    };

    const tracks = await prisma.track.findMany({
      where,
      include: { artistOwner: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: tracks });
  } catch {
    return NextResponse.json({ error: "Failed to fetch artist tracks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireRole(["ARTIST", "ADMIN"]);
  if (isAuthResponse(user)) return user;

  try {
    const body = await request.json();
    const requiredText = ["artistId", "trackName", "albumName"] as const;
    for (const field of requiredText) {
      if (typeof body[field] !== "string" || !body[field].trim()) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const claim = await prisma.artistClaim.findFirst({
      where: {
        userId: user.id,
        artistId: body.artistId,
        status: "APPROVED",
      },
      include: { artist: true },
    });
    if (!claim && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Artist claim must be approved before submitting tracks" }, { status: 403 });
    }

    const artist = claim?.artist ?? (await prisma.artist.findUnique({ where: { id: body.artistId } }));
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const duration = parseNumber(body.durationMs, "durationMs", 1, 600_000);
    if ("error" in duration) return NextResponse.json({ error: duration.error }, { status: 400 });
    const danceability = parseNumber(body.danceability, "danceability", 0, 1);
    if ("error" in danceability) return NextResponse.json({ error: danceability.error }, { status: 400 });
    const energy = parseNumber(body.energy, "energy", 0, 1);
    if ("error" in energy) return NextResponse.json({ error: energy.error }, { status: 400 });

    const previewError = getHttpsUrlError(body.previewUrl, "previewUrl");
    if (previewError) return NextResponse.json({ error: previewError }, { status: 400 });
    const coverError = getHttpsUrlError(body.coverUrl, "coverUrl");
    if (coverError) return NextResponse.json({ error: coverError }, { status: 400 });

    const popularity = 0;
    const explicit = Boolean(body.explicit);
    const track = await prisma.track.create({
      data: {
        trackId: `artist-${randomUUID()}`,
        artists:
          typeof body.artists === "string" && body.artists.trim()
            ? body.artists.trim()
            : artist.name,
        albumName: body.albumName.trim(),
        trackName: body.trackName.trim(),
        popularity,
        durationMs: Math.round(duration.value),
        explicit,
        danceability: danceability.value,
        energy: energy.value,
        previewUrl: body.previewUrl?.trim() || null,
        coverUrl: body.coverUrl?.trim() || null,
        moderationStatus: "PENDING",
        submittedById: user.id,
        artistOwnerId: artist.id,
        ...normalizedFeatures({
          popularity,
          durationMs: Math.round(duration.value),
          explicit,
          danceability: danceability.value,
          energy: energy.value,
        }),
      },
      include: { artistOwner: true },
    });

    return NextResponse.json(track, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit track" }, { status: 500 });
  }
}
