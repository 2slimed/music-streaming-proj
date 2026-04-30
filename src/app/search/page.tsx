"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Typography } from "@/components/ui/Typography";
import { TrackListItem } from "@/components/ui/TrackListItem";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { Playlist } from "@/types/api";
import Link from "next/link";
import { Play } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => api.search(debouncedQuery, "all", 20),
    enabled: debouncedQuery.length > 0,
  });

  const tracks = results?.tracks ?? [];
  const playlists = results?.playlists ?? [];

  return (
    <div className="p-6 md:p-10 space-y-8">
      {/* Search Header */}
      <div className="space-y-6">
        <Typography variant="h1">Search</Typography>
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-white/10 border border-white/10 rounded-full pl-12 pr-10 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && debouncedQuery && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface animate-pulse rounded-md" />
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && debouncedQuery && (
        <>
          {/* Tracks */}
          {tracks.length > 0 && (
            <section className="space-y-4">
              <Typography variant="h3">Tracks</Typography>
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
            </section>
          )}

          {/* Playlists */}
          {playlists.length > 0 && (
            <section className="space-y-4">
              <Typography variant="h3">Playlists</Typography>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {playlists.map((playlist: Playlist) => (
                  <Link
                    href={`/playlist/${playlist.id}`}
                    key={playlist.id}
                    className="space-y-3 cursor-pointer group"
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
                        by {playlist.user.name ?? "User"} &bull;{" "}
                        {playlist._count.tracks} tracks
                      </Typography>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {tracks.length === 0 && playlists.length === 0 && (
            <div className="py-12 text-center">
              <Typography variant="body" color="muted">
                No results found for &ldquo;{debouncedQuery}&rdquo;
              </Typography>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!debouncedQuery && (
        <div className="py-12 text-center">
          <Typography variant="body" color="muted">
            Start typing to search for tracks, artists, and playlists
          </Typography>
        </div>
      )}
    </div>
  );
}
