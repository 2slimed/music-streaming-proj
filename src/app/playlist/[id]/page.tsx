"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { TrackListItem } from "@/components/ui/TrackListItem";
import { Play, Heart, MoreHorizontal, Clock, Sparkles } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/lib/api";

export default function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data: playlist, isLoading } = useQuery({
    queryKey: ["playlist", id],
    queryFn: () => api.playlists.get(id),
  });

  const tracks = playlist?.tracks.map((pt) => pt.track) ?? [];

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

  if (!playlist) {
    return (
      <div className="flex items-center justify-center h-full">
        <Typography variant="h2" color="muted">
          Playlist not found
        </Typography>
      </div>
    );
  }

  const totalMs = tracks.reduce((acc, t) => acc + t.durationMs, 0);
  const totalMin = Math.floor(totalMs / 60000);
  const totalHr = Math.floor(totalMin / 60);
  const remainMin = totalMin % 60;
  const durationText = totalHr > 0 ? `${totalHr} hr ${remainMin} min` : `${totalMin} min`;

  return (
    <div className="space-y-8 pb-10">
      {/* Playlist Header Block */}
      <div className="w-full h-[400px] relative overflow-hidden flex items-end p-6 md:p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-background to-background z-0" />

        <div className="relative z-20 flex flex-col md:flex-row items-end gap-6 w-full">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-xl shadow-[0_0_40px_rgba(154,123,255,0.2)] overflow-hidden shrink-0 flex items-center justify-center">
            {playlist.coverUrl ? (
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center">
                <Sparkles className="w-24 h-24 text-white opacity-50" />
              </div>
            )}
          </div>
          <div className="space-y-4 flex-1">
            <Typography
              variant="caption"
              className="uppercase font-bold tracking-widest text-accent flex items-center gap-2"
            >
              Playlist
            </Typography>
            <Typography
              variant="h1"
              className="text-white drop-shadow-md text-4xl md:text-6xl font-bold"
            >
              {playlist.name}
            </Typography>
            {playlist.description && (
              <Typography variant="body" className="text-white/80 max-w-2xl">
                {playlist.description}
              </Typography>
            )}
            <div className="flex items-center gap-2">
              <Typography variant="caption" className="font-semibold">
                {playlist.user.name ?? "User"}
              </Typography>
              <Typography variant="caption" color="muted">
                &bull; {tracks.length} songs, {durationText}
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
          className="w-14 h-14 rounded-full shadow-[0_0_20px_rgba(250,88,182,0.4)]"
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
            className="hidden md:block flex-1"
          >
            Album
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
              showAlbum
              showCover
            />
          ))}
        </div>

        {tracks.length === 0 && (
          <div className="py-12 text-center">
            <Typography variant="body" color="muted">
              This playlist is empty
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}
