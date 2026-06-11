import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";

export type AuthUser = {
  id: string;
  role: UserRole;
};

export async function requireUser(): Promise<AuthUser | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return user;
}

export async function requireRole(
  roles: UserRole[],
): Promise<AuthUser | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return user;
}

export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  return requireRole(["ADMIN"]);
}

export function isAuthResponse(value: AuthUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
