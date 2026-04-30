"use client";

import { create } from "zustand";
import type { Track } from "@/types/api";

type RepeatMode = "off" | "one" | "all";

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  shufflePlayedIndices: Set<number>;
}

interface PlayerActions {
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setProgress: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  clearQueue: () => void;
}

function getShuffledIndex(current: number, length: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: "off",
  shufflePlayedIndices: new Set(),

  playTrack: (track, queue) => {
    const newQueue = queue ?? [track];
    const index = newQueue.findIndex((t) => t.id === track.id);
    const startIndex = index >= 0 ? index : 0;
    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: startIndex,
      isPlaying: true,
      progress: 0,
      duration: track.durationMs / 1000,
      shufflePlayedIndices: new Set([startIndex]),
    });
  },

  togglePlay: () => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    set((s) => ({ isPlaying: !s.isPlaying }));
  },

  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if (repeat === "one") {
      nextIndex = queueIndex;
    } else if (shuffle) {
      const { shufflePlayedIndices } = get();
      if (repeat === "off" && shufflePlayedIndices.size >= queue.length) {
        set({ isPlaying: false });
        return;
      }
      if (repeat === "all" && shufflePlayedIndices.size >= queue.length) {
        set({ shufflePlayedIndices: new Set() });
      }
      nextIndex = getShuffledIndex(queueIndex, queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === "all") {
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          return;
        }
      }
    }

    const nextTrack = queue[nextIndex];
    const { shufflePlayedIndices } = get();
    const newPlayed = new Set(shufflePlayedIndices);
    newPlayed.add(nextIndex);
    set({
      currentTrack: nextTrack,
      queueIndex: nextIndex,
      isPlaying: true,
      progress: 0,
      duration: nextTrack.durationMs / 1000,
      shufflePlayedIndices: newPlayed,
    });
  },

  prevTrack: () => {
    const { queue, queueIndex, progress, repeat } = get();
    if (queue.length === 0) return;

    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    let prevIndex: number;
    if (repeat === "one") {
      prevIndex = queueIndex;
    } else {
      prevIndex = queueIndex - 1;
      if (prevIndex < 0) {
        prevIndex = repeat === "all" ? queue.length - 1 : 0;
      }
    }

    const prevTrack = queue[prevIndex];
    set({
      currentTrack: prevTrack,
      queueIndex: prevIndex,
      isPlaying: true,
      progress: 0,
      duration: prevTrack.durationMs / 1000,
    });
  },

  seek: (seconds) => set({ progress: seconds }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setProgress: (seconds) => set({ progress: seconds }),
  setDuration: (seconds) => set({ duration: seconds }),

  toggleShuffle: () =>
    set((s) => ({
      shuffle: !s.shuffle,
      shufflePlayedIndices: new Set(s.shuffle ? [] : [s.queueIndex]),
    })),

  toggleRepeat: () =>
    set((s) => {
      const modes: RepeatMode[] = ["off", "all", "one"];
      const idx = modes.indexOf(s.repeat);
      return { repeat: modes[(idx + 1) % modes.length] };
    }),

  clearQueue: () =>
    set({
      currentTrack: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      progress: 0,
      duration: 0,
    }),
}));
