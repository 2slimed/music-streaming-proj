"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { TrackGrid } from "@/components/ui/TrackGrid";
import { TrackListItem } from "@/components/ui/TrackListItem";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/lib/api";

export default function HomePage() {
  const { data: session } = useSession();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data: popularData, isLoading: loadingPopular } = useQuery({
    queryKey: ["tracks", "popular"],
    queryFn: () => api.tracks.list({ sort: "popularity", limit: 12 }),
  });

  const { data: recentData } = useQuery({
    queryKey: ["recent-plays"],
    queryFn: () => api.profile.recentPlays(10),
    enabled: !!session?.user,
  });

  const { data: newData } = useQuery({
    queryKey: ["tracks", "recent"],
    queryFn: () => api.tracks.list({ sort: "recent", limit: 6 }),
  });

  const popularTracks = popularData?.data ?? [];
  const recentTracks = recentData?.data.map((rp) => rp.track) ?? [];
  const newTracks = newData?.data ?? [];

  function handlePlayHero() {
    if (popularTracks.length > 0) {
      playTrack(popularTracks[0], popularTracks);
    }
  }

  return (
    <div className="w-full">
      <div className="p-6 md:p-10 space-y-12">
        {/* Top Hero Banner */}
        <section>
          <div className="w-full h-64 md:h-80 rounded-3xl relative overflow-hidden flex items-end p-8 bg-[url('https://images.unsplash.com/photo-1614613535308-eb5fbbf2d098?q=80&w=3174&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
            <div className="relative z-10 space-y-4 max-w-2xl">
              <Typography
                variant="caption"
                className="text-accent uppercase font-bold tracking-widest"
              >
                Featured Playlist
              </Typography>
              <Typography variant="h1" className="text-white drop-shadow-md">
                Midnight City
              </Typography>
              <Typography variant="body" className="text-white/80 drop-shadow-sm">
                The best electronic and synthwave tracks curated by AI.
              </Typography>
              <div className="flex gap-4 pt-4">
                <Button
                  variant="default"
                  className="gap-2 rounded-full px-8"
                  onClick={handlePlayHero}
                >
                  <Play className="fill-current w-4 h-4" /> Play
                </Button>
                <Button variant="outline" className="rounded-full px-8">
                  Shuffle
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Listen Now (Popular Tracks) */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <Typography variant="h2">Listen Now</Typography>
          </div>

          {loadingPopular ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square rounded-xl bg-surface animate-pulse" />
                  <div className="h-4 bg-surface rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-surface rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <TrackGrid tracks={popularTracks.slice(0, 6)} />
          )}
        </section>

        {/* Recently Played */}
        {recentTracks.length > 0 && (
          <section className="space-y-6">
            <Typography variant="h2">Recently Played</Typography>
            <div className="space-y-1">
              {recentTracks.slice(0, 5).map((track, i) => (
                <TrackListItem
                  key={`${track.id}-${i}`}
                  track={track}
                  index={i}
                  queue={recentTracks}
                  showAlbum
                  showCover
                />
              ))}
            </div>
          </section>
        )}

        {/* New Releases */}
        {newTracks.length > 0 && (
          <section className="space-y-6">
            <Typography variant="h2">New Releases</Typography>
            <TrackGrid tracks={newTracks} />
          </section>
        )}
      </div>
    </div>
  );
}
