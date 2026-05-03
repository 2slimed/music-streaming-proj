"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { TrackListItem } from "@/components/ui/TrackListItem";
import { Play, Heart, MoreHorizontal, Clock } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/lib/api";

export default function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const albumName = decodeURIComponent(id);

  const { data: tracksData, isLoading } = useQuery({
    queryKey: ["album-tracks", albumName],
    queryFn: () => api.tracks.list({ album: albumName, limit: 50 }),
  });

  const tracks = tracksData?.data ?? [];
  const firstTrack = tracks[0];
  const artist = firstTrack?.artists ?? "Unknown Artist";
  const coverUrl = firstTrack?.coverUrl;

  const totalMs = tracks.reduce((acc, t) => acc + t.durationMs, 0);
  const totalMin = Math.floor(totalMs / 60000);

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
      {/* Album Header Block */}
      <div className="w-full h-[400px] relative overflow-hidden flex items-end p-6 md:p-10">
        {coverUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 z-0"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

        <div className="relative z-20 flex flex-col md:flex-row items-end gap-6 w-full">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl shadow-2xl overflow-hidden shrink-0">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={albumName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center">
                <Play className="w-12 h-12 text-muted" />
              </div>
            )}
          </div>
          <div className="space-y-4 flex-1">
            <Typography
              variant="caption"
              className="uppercase font-bold tracking-widest"
            >
              Album
            </Typography>
            <Typography
              variant="h1"
              className="text-white drop-shadow-md text-5xl md:text-7xl font-bold"
            >
              {albumName}
            </Typography>
            <div className="flex items-center gap-2">
              <Typography variant="caption" className="font-semibold">
                {artist}
              </Typography>
              <Typography variant="caption" color="muted">
                &bull; {tracks.length} songs, {totalMin} min
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 md:px-10 flex items-center gap-4">
        <Button
          variant="default"
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg"
          onClick={handlePlayAll}
        >
          <Play className="fill-current w-6 h-6 ml-1" />
        </Button>
        <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full border border-white/20">
          <Heart className="w-6 h-6 text-muted" />
        </Button>
        <Button variant="ghost" size="icon" className="w-12 h-12">
          <MoreHorizontal className="w-6 h-6 text-muted" />
        </Button>
      </div>

      {/* Track List */}
      <div className="px-6 md:px-10">
        <div className="w-full border-b border-white/5 pb-2 mb-4 flex px-4">
          <Typography variant="caption" color="muted" className="w-12">
            #
          </Typography>
          <Typography variant="caption" color="muted" className="flex-1">
            Title
          </Typography>
          <Typography
            variant="caption"
            color="muted"
            className="w-12 flex justify-end"
          >
            <Clock className="w-4 h-4" />
          </Typography>
        </div>

        <div className="space-y-1">
          {tracks.map((track, i) => (
            <TrackListItem
              key={track.id}
              track={track}
              index={i}
              queue={tracks}
              showCover={false}
            />
          ))}
        </div>

        {tracks.length === 0 && (
          <div className="py-12 text-center">
            <Typography variant="body" color="muted">
              No tracks found for this album
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}
