"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { TrackListItem } from "@/components/ui/TrackListItem";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { Play, Plus, Heart } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/lib/api";
import { GlassWindow } from "@/components/ui/GlassWindow";
import type { Playlist } from "@/types/api";
import Link from "next/link";

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: libraryData, isLoading: loadingLibrary } = useQuery({
    queryKey: ["library"],
    queryFn: () => api.library.list({ limit: 50 }),
    enabled: !!session?.user,
  });

  const { data: playlistsData, isLoading: loadingPlaylists } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.playlists.list({ limit: 50 }),
    enabled: !!session?.user,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.playlists.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-playlists"] });
      setShowCreate(false);
      setNewName("");
    },
  });

  // Redirect to login if not authenticated (side effect, not during render)
  useEffect(() => {
    if (status !== "loading" && !session?.user) {
      router.push("/login");
    }
  }, [status, session?.user, router]);

  if (status === "loading") {
    return (
      <div className="p-6 md:p-10 space-y-8">
        <div className="h-8 w-32 bg-surface animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const likedTracks = libraryData?.data.map((item) => item.track) ?? [];
  const userPlaylists =
    playlistsData?.data.filter((p: Playlist) => p.userId === session.user?.id) ?? [];

  function handlePlayLiked() {
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <Typography variant="h1">Library</Typography>
        <Button
          variant="outline"
          className="gap-2 rounded-full"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> New Playlist
        </Button>
      </div>

      {/* Create Playlist Inline */}
      {showCreate && (
        <GlassWindow intensity="light" className="p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-muted mb-1">Playlist name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-accent transition-colors"
              placeholder="My awesome playlist"
              autoFocus
            />
          </div>
          <Button
            variant="default"
            className="rounded-lg"
            onClick={() => {
              if (newName.trim()) createMutation.mutate(newName.trim());
            }}
            disabled={createMutation.isPending || !newName.trim()}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
          <Button
            variant="ghost"
            className="rounded-lg"
            onClick={() => setShowCreate(false)}
          >
            Cancel
          </Button>
        </GlassWindow>
      )}

      <div className="space-y-6">
        <Typography variant="h3">Playlists & Saved</Typography>
        <ScrollRow>
          {/* Liked Songs Card */}
          <div
            className="shrink-0 w-[45%] sm:w-[30%] md:w-[22%] lg:w-[18%] xl:w-[14%] rounded-xl shadow-lg cursor-pointer hover:scale-[1.02] transition-transform aspect-square relative overflow-hidden"
            onClick={handlePlayLiked}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-accent" />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <Heart className="w-8 h-8 text-white mb-2 fill-white" />
              <Typography variant="h3" className="text-white drop-shadow-md">
                Liked Songs
              </Typography>
              <Typography variant="caption" className="text-white/80">
                {libraryData?.meta.total ?? 0} songs
              </Typography>
            </div>
          </div>

          {userPlaylists.map((playlist: Playlist) => (
            <Link
              href={`/playlist/${playlist.id}`}
              key={playlist.id}
              className="shrink-0 w-[45%] sm:w-[30%] md:w-[22%] lg:w-[18%] xl:w-[14%] space-y-3 cursor-pointer group"
            >
              <div className="aspect-square rounded-xl bg-surface hover:bg-surface-hover overflow-hidden relative shadow-lg">
                {playlist.coverUrl ? (
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center">
                    <Play className="w-10 h-10 text-muted" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="default"
                    size="icon"
                    className="rounded-full h-12 w-12 hover:scale-110"
                  >
                    <Play className="fill-current w-5 h-5 ml-1" />
                  </Button>
                </div>
              </div>
              <div>
                <Typography
                  variant="caption"
                  className="block truncate font-semibold"
                >
                  {playlist.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="muted"
                  className="block truncate text-xs"
                >
                  {playlist._count.tracks} tracks
                </Typography>
              </div>
            </Link>
          ))}

          {loadingPlaylists &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[45%] sm:w-[30%] md:w-[22%] lg:w-[18%] xl:w-[14%] space-y-3">
                <div className="aspect-square rounded-xl bg-surface animate-pulse" />
                <div className="h-4 bg-surface rounded animate-pulse w-3/4" />
              </div>
            ))}
        </ScrollRow>
      </div>

      {/* Liked Songs Track List */}
      {likedTracks.length > 0 && (
        <div className="space-y-6">
          <Typography variant="h3">Liked Songs</Typography>
          <div className="space-y-1">
            {likedTracks.map((track, i) => (
              <TrackListItem
                key={track.id}
                track={track}
                index={i}
                queue={likedTracks}
                showAlbum
                showCover
              />
            ))}
          </div>
        </div>
      )}

      {!loadingLibrary && likedTracks.length === 0 && userPlaylists.length === 0 && (
        <div className="py-12 text-center">
          <Typography variant="body" color="muted">
            Your library is empty. Start exploring and liking tracks!
          </Typography>
        </div>
      )}
    </div>
  );
}
