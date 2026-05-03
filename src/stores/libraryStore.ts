"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

interface LibraryState {
  likedTrackIds: Set<string>;
  loaded: boolean;
}

interface LibraryActions {
  fetchLikedIds: () => Promise<void>;
  toggleLike: (trackId: string) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  reset: () => void;
}

export const useLibraryStore = create<LibraryState & LibraryActions>(
  (set, get) => ({
    likedTrackIds: new Set(),
    loaded: false,

    fetchLikedIds: async () => {
      try {
        const res = await api.library.list({ limit: 100 });
        const ids = new Set(res.data.map((item) => item.trackId));
        set({ likedTrackIds: ids, loaded: true });
      } catch {
        set({ loaded: true });
      }
    },

    toggleLike: async (trackId: string) => {
      const { likedTrackIds } = get();
      const wasLiked = likedTrackIds.has(trackId);

      const next = new Set(likedTrackIds);
      if (wasLiked) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      set({ likedTrackIds: next });

      try {
        if (wasLiked) {
          await api.library.remove(trackId);
        } else {
          await api.library.add(trackId);
        }
      } catch {
        const rollback = new Set(get().likedTrackIds);
        if (wasLiked) {
          rollback.add(trackId);
        } else {
          rollback.delete(trackId);
        }
        set({ likedTrackIds: rollback });
      }
    },

    isLiked: (trackId: string) => get().likedTrackIds.has(trackId),

    reset: () => set({ likedTrackIds: new Set(), loaded: false }),
  }),
);
