"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { AlbumGrid } from "@/components/ui/AlbumGrid";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/lib/api";
import Link from "next/link";
import type { Artist } from "@/types/api";

export default function HomePage() {
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data: albumsData, isLoading: loadingAlbums } = useQuery({
    queryKey: ["albums", "popular"],
    queryFn: () => api.albums.list({ limit: 12 }),
  });

  const { data: artistsData } = useQuery({
    queryKey: ["artists", "discover"],
    queryFn: () => api.artists.list({ limit: 10 }),
  });

  const { data: newAlbumsData } = useQuery({
    queryKey: ["albums", "recent"],
    queryFn: () => api.albums.list({ sort: "recent", limit: 6 }),
  });

  const albums = albumsData?.data ?? [];
  const artists = artistsData?.data ?? [];
  const newAlbums = newAlbumsData?.data ?? [];

  function handlePlayHero() {
    if (albums.length > 0) {
      api.tracks.list({ album: albums[0].name, limit: 50 }).then((res) => {
        if (res.data.length > 0) {
          playTrack(res.data[0], res.data);
        }
      });
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

        {/* Section: Albums */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <Typography variant="h2">Listen Now</Typography>
          </div>

          {loadingAlbums ? (
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
            <AlbumGrid albums={albums.slice(0, 6)} />
          )}
        </section>

        {/* Discover Artists */}
        {artists.length > 0 && (
          <section className="space-y-6">
            <Typography variant="h2">Discover Artists</Typography>
            <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
              {artists.map((artist: Artist) => (
                <Link
                  href={`/artist/${encodeURIComponent(artist.name)}`}
                  key={artist.id}
                  className="flex flex-col items-center gap-3 shrink-0 group"
                >
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-lg bg-surface hover:shadow-xl transition-shadow">
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-purple-600/20" />
                    )}
                  </div>
                  <div className="text-center max-w-[7rem] md:max-w-[9rem]">
                    <Typography
                      variant="caption"
                      className="block truncate font-semibold group-hover:text-accent transition-colors"
                    >
                      {artist.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="muted"
                      className="block truncate text-xs"
                    >
                      Artist
                    </Typography>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* New Releases */}
        {newAlbums.length > 0 && (
          <section className="space-y-6">
            <Typography variant="h2">New Releases</Typography>
            <AlbumGrid albums={newAlbums} />
          </section>
        )}
      </div>
    </div>
  );
}
