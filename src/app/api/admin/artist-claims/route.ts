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
    const claims = await prisma.artistClaim.findMany({
      where: STATUSES.includes(status as ModerationStatus)
        ? { status: status as ModerationStatus }
        : undefined,
      include: {
        artist: true,
        user: { select: { id: true, name: true, email: true, image: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: claims });
  } catch {
    return NextResponse.json({ error: "Failed to fetch artist claims" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (isAuthResponse(admin)) return admin;

  try {
    const body = await request.json();
    if (typeof body.claimId !== "string" || !body.claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const claim = await prisma.artistClaim.update({
      where: { id: body.claimId },
      data: { status: body.status },
      include: {
        artist: true,
        user: { select: { id: true, name: true, email: true, image: true, role: true } },
      },
    });

    if (body.status === "APPROVED" && claim.user.role === "LISTENER") {
      await prisma.user.update({
        where: { id: claim.userId },
        data: { role: "ARTIST" },
      });
      claim.user.role = "ARTIST";
    }

    return NextResponse.json(claim);
  } catch {
    return NextResponse.json({ error: "Failed to update artist claim" }, { status: 500 });
  }
}
