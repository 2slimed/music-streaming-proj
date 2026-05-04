"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Bot, PlayCircle, Library, Music2, Search, Plus } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { api } from "@/lib/api";
import type { Playlist } from "@/types/api";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const { data: playlistsData } = useQuery({
    queryKey: ["sidebar-playlists"],
    queryFn: () => api.playlists.list({ limit: 20 }),
    enabled: !!session?.user,
  });

  const userPlaylists = playlistsData?.data.filter(
    (p: Playlist) => p.userId === session?.user?.id,
  );

  function isActive(path: string) {
    return pathname === path;
  }

  return (
    <aside className="w-64 bg-surface border-r border-white/5 hidden md:flex flex-col">
      <div className="p-6">
        <Link href="/">
          <Typography variant="h3" className="flex items-center gap-2">
            <Music2 className="w-6 h-6 text-accent" />
            MelodyMix
          </Typography>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-24 pt-4">
        <Link href="/">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${isActive("/") ? "bg-white/10" : ""}`}
          >
            <PlayCircle className="w-5 h-5 text-accent" /> Listen Now
          </Button>
        </Link>
        <Link href="/search">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${isActive("/search") ? "bg-white/10" : ""}`}
          >
            <Search className="w-5 h-5 text-accent" /> Browse
          </Button>
        </Link>
        <Link href="/library">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${isActive("/library") ? "bg-white/10" : ""}`}
          >
            <Library className="w-5 h-5 text-accent" /> Library
          </Button>
        </Link>
        <Link href="/chatbot">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${isActive("/chatbot") ? "bg-white/10" : ""}`}
          >
            <Bot className="w-5 h-5 text-accent" /> Chatbot
          </Button>
        </Link>

        <div className="my-4 border-t border-white/5" />

        {session?.user && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <Typography variant="caption" color="muted" className="text-xs uppercase tracking-wider font-semibold">
                Playlists
              </Typography>
              <Link href="/library">
                <Plus className="w-4 h-4 text-muted hover:text-foreground transition-colors cursor-pointer" />
              </Link>
            </div>
            {userPlaylists?.map((playlist: Playlist) => (
              <Link
                href={`/playlist/${playlist.id}`}
                key={playlist.id}
                className="w-full block"
              >
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-muted truncate ${
                    pathname === `/playlist/${playlist.id}` ? "bg-white/10 text-foreground" : ""
                  }`}
                >
                  {playlist.name}
                </Button>
              </Link>
            ))}
            {userPlaylists?.length === 0 && (
              <Typography variant="caption" color="muted" className="px-2 text-xs">
                No playlists yet
              </Typography>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-white/5">
        <UserMenu />
      </div>
    </aside>
  );
}
