"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Typography } from "@/components/ui/Typography";
import type { UserRole } from "@/types/api";

export function RoleGate({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && !session?.user) {
      router.push("/login");
    }
  }, [router, session?.user, status]);

  if (status === "loading") {
    return <div className="m-6 h-40 rounded-2xl bg-surface animate-pulse" />;
  }

  if (!session?.user) return null;

  if (!allowed.includes(session.user.role)) {
    return (
      <div className="p-6 md:p-10">
        <Typography variant="h1">Forbidden</Typography>
        <Typography variant="body" color="muted" className="mt-2">
          Your account does not have access to this workspace.
        </Typography>
      </div>
    );
  }

  return <>{children}</>;
}
