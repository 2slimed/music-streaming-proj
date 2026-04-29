import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/tracks/:id/stream
 *
 * Proxies the Spotify 30-second preview through our server so that:
 *   1. The real preview URL is never exposed to the client.
 *   2. We can enforce authentication.
 *   3. HTTP Range requests are supported for seeking.
 *
 * Flow:
 *   - Resolve track → get previewUrl (or fetch from Spotify API).
 *   - If the client sends a Range header, forward it upstream.
 *   - Return the audio bytes with correct Content-Range / 206 status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // --- Auth guard -----------------------------------------------------------
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const track = await prisma.track.findFirst({
      where: { OR: [{ id }, { trackId: id }] },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // If no previewUrl stored yet, try to resolve via Spotify API
    let previewUrl = track.previewUrl;

    if (!previewUrl && track.spotifyId) {
      previewUrl = await resolveSpotifyPreview(track.spotifyId);

      if (previewUrl) {
        await prisma.track.update({
          where: { id: track.id },
          data: { previewUrl },
        });
      }
    }

    if (!previewUrl) {
      return NextResponse.json(
        { error: "No preview available for this track" },
        { status: 404 }
      );
    }

    // --- Proxy the audio with Range support ---------------------------------
    const rangeHeader = request.headers.get("range");
    const upstreamHeaders: HeadersInit = {};
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    let upstream = await fetch(previewUrl, { headers: upstreamHeaders });

    // If the cached preview URL is stale (expired), invalidate and re-resolve
    if (!upstream.ok && upstream.status !== 206 && track.spotifyId) {
      await prisma.track.update({
        where: { id: track.id },
        data: { previewUrl: null },
      });

      const freshUrl = await resolveSpotifyPreview(track.spotifyId);
      if (freshUrl) {
        await prisma.track.update({
          where: { id: track.id },
          data: { previewUrl: freshUrl },
        });
        upstream = await fetch(freshUrl, { headers: upstreamHeaders });
      }
    }

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: "Failed to fetch audio from upstream" },
        { status: 502 }
      );
    }

    // Record play only on initial request (no Range header) and after
    // confirming the upstream fetch succeeded.
    const userId = session.user.id;
    if (userId && !rangeHeader) {
      prisma.recentPlay.create({
        data: { userId, trackId: track.id },
      }).catch(() => { /* play tracking is best-effort */ });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") ?? "audio/mpeg");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "private, max-age=3600");

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("Content-Range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Streaming failed" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Spotify preview URL resolver
// ---------------------------------------------------------------------------
async function resolveSpotifyPreview(spotifyId: string): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    // Client credentials flow
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) return null;
    const { access_token } = await tokenRes.json();

    const trackRes = await fetch(
      `https://api.spotify.com/v1/tracks/${spotifyId}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!trackRes.ok) return null;
    const data = await trackRes.json();

    return data.preview_url ?? null;
  } catch {
    return null;
  }
}
