"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Bot, PlayCircle, Library, Menu, Music2, Search, Plus, X } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { api } from "@/lib/api";
import type { Playlist } from "@/types/api";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  const navigationContent = (
    <>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-24 pt-4">
        <Link href="/" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${isActive("/") ? "bg-white/10" : ""}`}
          >
            <PlayCircle className="w-5 h-5 text-accent" /> Listen Now
          </Button>
        </Link>
        <Link href="/search" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${isActive("/search") ? "bg-white/10" : ""}`}
          >
            <Search className="w-5 h-5 text-accent" /> Browse
          </Button>
        </Link>
        <Link href="/library" onClick={() => setIsMobileOpen(false)}>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${isActive("/library") ? "bg-white/10" : ""}`}
          >
            <Library className="w-5 h-5 text-accent" /> Library
          </Button>
        </Link>
        <Link href="/chatbot" onClick={() => setIsMobileOpen(false)}>
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
              <Link href="/library" onClick={() => setIsMobileOpen(false)}>
                <Plus className="w-4 h-4 text-muted hover:text-foreground transition-colors cursor-pointer" />
              </Link>
            </div>
            {userPlaylists?.map((playlist: Playlist) => (
              <Link
                href={`/playlist/${playlist.id}`}
                key={playlist.id}
                className="w-full block"
                onClick={() => setIsMobileOpen(false)}
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
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-background/90 px-4 backdrop-blur-md md:hidden">
        <Link href="/" className="min-w-0">
          <Typography variant="h4" className="flex items-center gap-2 truncate">
            <Music2 className="h-6 w-6 shrink-0 text-accent" />
            MelodyMix
          </Typography>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col border-r border-white/10 bg-surface shadow-2xl transition-transform duration-300 md:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-5">
          <Link href="/" onClick={() => setIsMobileOpen(false)}>
            <Typography variant="h4" className="flex items-center gap-2">
              <Music2 className="h-6 w-6 text-accent" />
              MelodyMix
            </Typography>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {navigationContent}
      </aside>

      <aside className="w-64 bg-surface border-r border-white/5 hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/" onClick={() => setIsMobileOpen(false)}>
            <Typography variant="h3" className="flex items-center gap-2">
              <Music2 className="w-6 h-6 text-accent" />
              MelodyMix
            </Typography>
          </Link>
        </div>
        {navigationContent}
      </aside>
    </>
  );
}
