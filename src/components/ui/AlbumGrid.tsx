"use client";

import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/lib/api";
import type { Album } from "@/types/api";
import Link from "next/link";

interface AlbumGridProps {
  albums: Album[];
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  const playTrack = usePlayerStore((s) => s.playTrack);

  async function handlePlayAlbum(e: React.MouseEvent, album: Album) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.tracks.list({ album: album.name, limit: 50 });
      const tracks = res.data;
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch {
      /* best-effort */
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {albums.map((album) => (
        <Link
          href={`/album/${encodeURIComponent(album.name)}`}
          key={album.id}
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
              <div className="w-full h-full bg-gradient-to-br from-accent/20 to-purple-600/20 flex items-center justify-center">
                <Play className="w-10 h-10 text-muted" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="default"
                size="icon"
                className="rounded-full h-10 w-10 hover:scale-110 shadow-xl transition-transform"
                onClick={(e) => handlePlayAlbum(e, album)}
              >
                <Play className="fill-current w-4 h-4 ml-0.5" />
              </Button>
            </div>
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
              {album.artists}
            </Typography>
          </div>
        </Link>
      ))}
    </div>
  );
}
