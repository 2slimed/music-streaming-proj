"use client";

import { useCallback, useRef } from "react";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useSession } from "next-auth/react";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BottomPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const prevTrack = usePlayerStore((s) => s.prevTrack);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const { data: session } = useSession();
  const isLiked = useLibraryStore((s) =>
    currentTrack ? s.isLiked(currentTrack.id) : false,
  );
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(pct * duration);
    },
    [duration, seek],
  );

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = volumeBarRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setVolume(pct);
    },
    [setVolume],
  );

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 md:px-6 md:pb-6 pointer-events-none">
      <GlassWindow
        intensity="medium"
        className="pointer-events-auto h-20 md:h-24 w-full max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 border-t-0 md:rounded-2xl shadow-2xl"
      >
        {/* Song Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
          <div className="hidden md:block w-14 h-14 rounded-md bg-surface overflow-hidden shadow-md">
            {currentTrack?.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.trackName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface flex items-center justify-center">
                <Play className="w-6 h-6 text-muted" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <Typography
              variant="caption"
              className="font-semibold line-clamp-1 text-base"
            >
              {currentTrack?.trackName ?? "Not Playing"}
            </Typography>
            {currentTrack && (
              <Typography
                variant="caption"
                color="muted"
                className="text-xs line-clamp-1"
              >
                {currentTrack.artists}
              </Typography>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-2xl px-4">
          <div className="flex items-center gap-4 md:gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={toggleShuffle}
            >
              <Shuffle
                className={`w-4 h-4 ${shuffle ? "text-accent" : "text-muted hover:text-foreground"}`}
              />
            </Button>
            <Button variant="ghost" size="icon" onClick={prevTrack}>
              <SkipBack className="w-6 h-6 fill-foreground" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="w-12 h-12 bg-foreground text-background hover:bg-foreground/90 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 ml-1 fill-current" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextTrack}>
              <SkipForward className="w-6 h-6 fill-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={toggleRepeat}
            >
              <RepeatIcon
                className={`w-4 h-4 ${repeat !== "off" ? "text-accent" : "text-muted hover:text-foreground"}`}
              />
            </Button>
          </div>
          {/* Progress Bar */}
          <div className="hidden md:flex items-center gap-3 w-full mt-2">
            <Typography variant="caption" className="text-[10px] text-muted w-10 text-right">
              {formatTime(progress)}
            </Typography>
            <div
              ref={progressBarRef}
              className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer group"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-foreground rounded-full group-hover:bg-accent transition-colors relative"
                style={{ width: `${progressPct}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100" />
              </div>
            </div>
            <Typography variant="caption" className="text-[10px] text-muted w-10">
              {formatTime(duration)}
            </Typography>
          </div>
        </div>

        {/* Right Tools */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          {session?.user && currentTrack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleLike(currentTrack.id)}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isLiked
                    ? "text-accent fill-accent"
                    : "text-muted hover:text-foreground"
                }`}
              />
            </Button>
          )}
          <div className="flex items-center gap-2 w-28">
            <button
              onClick={toggleMute}
              className="text-muted hover:text-foreground transition-colors"
            >
              {volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <div
              ref={volumeBarRef}
              className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
              onClick={handleVolumeClick}
            >
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      </GlassWindow>
    </div>
  );
}
