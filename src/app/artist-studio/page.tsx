"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, Heart, ListMusic, Mic2, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RoleGate } from "@/components/ui/RoleGate";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { FadeIn } from "@/components/ui/FadeIn";
import { api } from "@/lib/api";

export default function ArtistStudioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["artist-studio-summary"],
    queryFn: api.artistStudio.summary,
  });

  const stats: Array<[string, number, LucideIcon]> = [
    ["Tracks", data?.stats.tracks ?? 0, Music],
    ["Likes", data?.stats.likes ?? 0, Heart],
    ["Playlist Adds", data?.stats.playlistAdds ?? 0, ListMusic],
    ["Pending", data?.stats.pendingTracks ?? 0, Clock],
    ["Avg Popularity", data?.stats.averagePopularity ?? 0, BarChart3],
  ];

  return (
    <RoleGate allowed={["ARTIST", "ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <Typography variant="caption" className="uppercase tracking-widest text-accent font-semibold">
              Creator workspace
            </Typography>
            <Typography variant="h1">Artist Studio</Typography>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/artist-studio/claims"><Button variant="outline">Claims</Button></Link>
            <Link href="/artist-studio/profile"><Button variant="outline">Profile</Button></Link>
            <Link href="/artist-studio/tracks"><Button>Tracks</Button></Link>
          </div>
        </div>
        </FadeIn>

        {isLoading ? (
          <div className="h-48 rounded-2xl bg-surface animate-pulse" />
        ) : (
          <>
            <FadeIn delay={0.05}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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

            <FadeIn delay={0.1}>
            <GlassWindow intensity="medium" className="p-6">
              <Typography variant="h3" className="mb-4">Owned Artists</Typography>
              {data?.approvedArtists.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.approvedArtists.map((artist) => (
                    <div key={artist.id} className="flex items-center gap-4 rounded-lg bg-white/5 p-4">
                      {artist.imageUrl ? (
                        <img src={artist.imageUrl} alt={artist.name} className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                          <Mic2 className="h-7 w-7 text-accent" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Typography variant="h4" className="truncate">{artist.name}</Typography>
                        <Typography variant="caption" color="muted">
                          {artist.nbFan?.toLocaleString() ?? 0} fans
                        </Typography>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <Typography variant="body" color="muted">
                    No approved artist claims yet. Claim an artist profile to unlock profile editing and track submissions.
                  </Typography>
                  <Link href="/artist-studio/claims"><Button>Claim Artist</Button></Link>
                </div>
              )}
            </GlassWindow>
            </FadeIn>

            <FadeIn delay={0.15}>
            <GlassWindow intensity="light" className="p-6">
              <Typography variant="h3" className="mb-4">Claim Status</Typography>
              <div className="space-y-2">
                {data?.claims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                    <Typography variant="body">{claim.artist.name}</Typography>
                    <Typography variant="caption" className="text-accent">{claim.status}</Typography>
                  </div>
                ))}
                {data?.claims.length === 0 && (
                  <Typography variant="body" color="muted">You have not submitted any artist claims.</Typography>
                )}
              </div>
            </GlassWindow>
            </FadeIn>
          </>
        )}
      </div>
      </PageTransition>
    </RoleGate>
  );
}
