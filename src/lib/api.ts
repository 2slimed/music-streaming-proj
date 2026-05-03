import type {
  Track,
  Playlist,
  PlaylistWithTracks,
  LibraryItem,
  UserProfile,
  RecentPlay,
  PaginatedResponse,
  SearchResults,
} from "@/types/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string | number] => e[1] !== undefined,
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const api = {
  tracks: {
    list(params?: {
      page?: number;
      limit?: number;
      sort?: string;
      artist?: string;
      album?: string;
    }) {
      return apiFetch<PaginatedResponse<Track>>(
        `/api/tracks${qs(params ?? {})}`,
      );
    },
    get(id: string) {
      return apiFetch<Track>(`/api/tracks/${encodeURIComponent(id)}`);
    },
    streamUrl(id: string) {
      return `/api/tracks/${encodeURIComponent(id)}/stream`;
    },
  },

  playlists: {
    list(params?: { page?: number; limit?: number }) {
      return apiFetch<PaginatedResponse<Playlist>>(
        `/api/playlists${qs(params ?? {})}`,
      );
    },
    get(id: string) {
      return apiFetch<PlaylistWithTracks>(
        `/api/playlists/${encodeURIComponent(id)}`,
      );
    },
    create(body: { name: string; description?: string; privacy?: string }) {
      return apiFetch<Playlist>("/api/playlists", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    update(
      id: string,
      body: { name?: string; description?: string; privacy?: string },
    ) {
      return apiFetch<Playlist>(`/api/playlists/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    delete(id: string) {
      return apiFetch<{ success: boolean }>(
        `/api/playlists/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
    },
    addTrack(playlistId: string, trackId: string) {
      return apiFetch<{ id: string }>(
        `/api/playlists/${encodeURIComponent(playlistId)}/tracks`,
        { method: "POST", body: JSON.stringify({ trackId }) },
      );
    },
    removeTrack(playlistId: string, trackId: string) {
      return apiFetch<{ success: boolean }>(
        `/api/playlists/${encodeURIComponent(playlistId)}/tracks`,
        { method: "DELETE", body: JSON.stringify({ trackId }) },
      );
    },
  },

  library: {
    list(params?: { page?: number; limit?: number }) {
      return apiFetch<PaginatedResponse<LibraryItem>>(
        `/api/library${qs(params ?? {})}`,
      );
    },
    add(trackId: string) {
      return apiFetch<LibraryItem>("/api/library", {
        method: "POST",
        body: JSON.stringify({ trackId }),
      });
    },
    remove(trackId: string) {
      return apiFetch<{ success: boolean }>("/api/library", {
        method: "DELETE",
        body: JSON.stringify({ trackId }),
      });
    },
  },

  search(query: string, type?: string, limit?: number) {
    return apiFetch<SearchResults>(
      `/api/search${qs({ q: query, type, limit })}`,
    );
  },

  profile: {
    get() {
      return apiFetch<UserProfile>("/api/profile");
    },
    update(body: { name?: string; image?: string | null }) {
      return apiFetch<UserProfile>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    recentPlays(limit?: number) {
      return apiFetch<{ data: RecentPlay[] }>(
        `/api/profile/recent-plays${qs({ limit })}`,
      );
    },
  },

  auth: {
    register(body: { name: string; email: string; password: string }) {
      return apiFetch<{ id: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  },
};
