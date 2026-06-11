"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/components/ui/RoleGate";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { FadeIn } from "@/components/ui/FadeIn";
import { api } from "@/lib/api";

export default function AdminModerationPage() {
  const { data: claims } = useQuery({
    queryKey: ["admin-artist-claims", "pending"],
    queryFn: () => api.admin.artistClaims.list({ status: "PENDING" }),
  });
  const { data: tracks } = useQuery({
    queryKey: ["admin-tracks", "pending"],
    queryFn: () => api.admin.tracks.list({ status: "PENDING" }),
  });

  return (
    <RoleGate allowed={["ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <Typography variant="h1">Moderation</Typography>
        </FadeIn>
        <FadeIn delay={0.05}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <GlassWindow intensity="medium" className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Typography variant="h3">Pending Artist Claims</Typography>
              <Link href="/admin/artists"><Button size="sm" variant="outline">Review</Button></Link>
            </div>
            <div className="space-y-2">
              {claims?.data.slice(0, 5).map((claim) => (
                <div key={claim.id} className="rounded-lg bg-white/5 p-3">
                  <Typography variant="body">{claim.artist.name}</Typography>
                  <Typography variant="caption" color="muted">{claim.user?.email ?? "No email"}</Typography>
                </div>
              ))}
              {claims?.data.length === 0 && <Typography variant="body" color="muted">No pending claims.</Typography>}
            </div>
          </GlassWindow>

          <GlassWindow intensity="medium" className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <Typography variant="h3">Pending Tracks</Typography>
              <Link href="/admin/tracks"><Button size="sm" variant="outline">Review</Button></Link>
            </div>
            <div className="space-y-2">
              {tracks?.data.slice(0, 5).map((track) => (
                <div key={track.id} className="rounded-lg bg-white/5 p-3">
                  <Typography variant="body">{track.trackName}</Typography>
                  <Typography variant="caption" color="muted">{track.albumName} · {track.artists}</Typography>
                </div>
              ))}
              {tracks?.data.length === 0 && <Typography variant="body" color="muted">No pending tracks.</Typography>}
            </div>
          </GlassWindow>
        </div>
        </FadeIn>
      </div>
      </PageTransition>
    </RoleGate>
  );
}
