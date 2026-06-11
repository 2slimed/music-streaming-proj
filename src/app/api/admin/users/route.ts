import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireAdmin } from "@/lib/authz";
import type { UserRole } from "@/generated/prisma/client";

const ROLES: UserRole[] = ["LISTENER", "ARTIST", "ADMIN"];

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (isAuthResponse(admin)) return admin;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          _count: { select: { playlists: true, libraryItems: true, artistClaims: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (isAuthResponse(admin)) return admin;

  try {
    const body = await request.json();
    if (typeof body.userId !== "string" || !body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "ADMIN" && body.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last admin" },
          { status: 400 },
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: body.userId },
      data: { role: body.role },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
