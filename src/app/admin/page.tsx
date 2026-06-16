"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Disc3, ListMusic, Mic2, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RoleGate } from "@/components/ui/RoleGate";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { FadeIn } from "@/components/ui/FadeIn";
import { api } from "@/lib/api";

export default function AdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: api.admin.summary,
  });

  const stats: Array<[string, number, LucideIcon]> = [
    ["Users", data?.users ?? 0, Users],
    ["Artists", data?.artists ?? 0, Mic2],
    ["Tracks", data?.tracks ?? 0, Disc3],
    ["Playlists", data?.playlists ?? 0, ListMusic],
    ["Pending Claims", data?.pendingArtistClaims ?? 0, ShieldCheck],
    ["Pending Tracks", data?.pendingTrackSubmissions ?? 0, ShieldCheck],
  ];

  return (
    <RoleGate allowed={["ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <Typography variant="caption" className="uppercase tracking-widest text-accent font-semibold">
              Platform controls
            </Typography>
            <Typography variant="h1">Admin</Typography>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/users"><Button variant="outline">Users</Button></Link>
            <Link href="/admin/artists"><Button variant="outline">Artist Claims</Button></Link>
            <Link href="/admin/tracks"><Button variant="outline">Tracks</Button></Link>
            <Link href="/admin/moderation"><Button>Moderation</Button></Link>
          </div>
        </div>
        </FadeIn>

        {isLoading ? (
          <div className="h-48 rounded-2xl bg-surface animate-pulse" />
        ) : (
          <FadeIn delay={0.05}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.map(([label, value, Icon]) => (
              <GlassWindow key={String(label)} intensity="light" className="p-5">
                <Typography variant="caption" color="muted" className="flex items-center gap-2">
                  <Icon className="w-4 h-4" /> {String(label)}
                </Typography>
                <Typography variant="h2">{String(value)}</Typography>
              </GlassWindow>
            ))}
          </div>
          </FadeIn>
        )}
      </div>
      </PageTransition>
    </RoleGate>
  );
}
