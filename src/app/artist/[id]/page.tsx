"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { TrackListItem } from "@/components/ui/TrackListItem";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/lib/api";
import Link from "next/link";

export default function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const artistName = decodeURIComponent(id);

  const { data: tracksData, isLoading } = useQuery({
    queryKey: ["artist-tracks", artistName],
    queryFn: () =>
      api.tracks.list({ artist: artistName, sort: "popularity", limit: 50 }),
  });

  const tracks = tracksData?.data ?? [];

  const albumNames = [...new Set(tracks.map((t) => t.albumName))];
  const albums = albumNames.map((name) => {
    const t = tracks.find((tr) => tr.albumName === name);
    return { name, coverUrl: t?.coverUrl };
  });

  function handlePlayAll() {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="w-full h-[400px] bg-surface animate-pulse" />
        <div className="px-6 md:px-10 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Artist Hero Header */}
      <div className="w-full h-[400px] relative overflow-hidden flex items-end p-6 md:p-10 justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-background z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />

        <div className="relative z-20 space-y-4 max-w-4xl mx-auto flex flex-col items-center">
          <Typography variant="caption" className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-500/30">
            Artist
          </Typography>
          <Typography
            variant="h1"
            className="text-white drop-shadow-lg text-6xl md:text-8xl font-black tracking-tighter"
          >
            {artistName}
          </Typography>
          <Typography variant="body" className="text-white/80">
            {tracksData?.meta.total ?? 0} tracks available
          </Typography>
          <div className="flex gap-4 pt-4">
            <Button
              variant="default"
              className="rounded-full px-8 gap-2"
              onClick={handlePlayAll}
            >
              <Play className="w-4 h-4 fill-current" /> Play
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 space-y-12">
        {/* Popular Tracks */}
        <section className="space-y-6">
          <Typography variant="h2">Popular</Typography>
          <div className="space-y-1">
            {tracks.slice(0, 10).map((track, i) => (
              <TrackListItem
                key={track.id}
                track={track}
                index={i}
                queue={tracks}
                showAlbum
                showCover
              />
            ))}
          </div>
          {tracks.length === 0 && (
            <Typography variant="body" color="muted">
              No tracks found for this artist
            </Typography>
          )}
        </section>

        {/* Albums */}
        {albums.length > 0 && (
          <section className="space-y-6">
            <Typography variant="h2">Albums</Typography>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {albums.map((album) => (
                <Link
                  href={`/album/${encodeURIComponent(album.name)}`}
                  key={album.name}
                  className="space-y-3 cursor-pointer group"
                >
                  <div className="aspect-square rounded-xl bg-surface hover:bg-surface-hover overflow-hidden relative shadow-lg">
                    {album.coverUrl ? (
                      <img
                        src={album.coverUrl}
                        alt={album.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-purple-600/20" />
                    )}
                  </div>
                  <div>
                    <Typography
                      variant="caption"
                      className="block truncate font-semibold"
                    >
                      {album.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="muted"
                      className="block truncate text-xs"
                    >
                      Album
                    </Typography>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
