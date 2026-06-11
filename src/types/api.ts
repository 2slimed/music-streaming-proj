export type UserRole = "LISTENER" | "ARTIST" | "ADMIN";
export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Track {
  id: string;
  trackId: string;
  artists: string;
  albumName: string;
  trackName: string;
  popularity: number;
  durationMs: number;
  explicit: boolean;
  danceability: number;
  energy: number;
  popularityNorm: number;
  durationMsNorm: number;
  explicitNorm: number;
  danceabilityNorm: number;
  energyNorm: number;
  externalId: string | null;
  previewUrl: string | null;
  coverUrl: string | null;
  moderationStatus: ModerationStatus;
  submittedById: string | null;
  artistOwnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PlaylistUser {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  privacy: "PUBLIC" | "PRIVATE";
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: PlaylistUser;
  _count: { tracks: number };
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
  track: Track;
}

export interface PlaylistWithTracks extends Omit<Playlist, "_count"> {
  tracks: PlaylistTrack[];
}

export interface LibraryItem {
  id: string;
  userId: string;
  trackId: string;
  addedAt: string;
  track: Track;
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  createdAt: string;
  _count: {
    playlists: number;
    libraryItems: number;
  };
}

export interface Album {
  id: string;
  name: string;
  artists: string;
  coverUrl: string | null;
  createdAt: string;
}

export interface Artist {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  deezerArtistId: string | null;
  nbFan: number | null;
  nbAlbum: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtistClaim {
  id: string;
  userId: string;
  artistId: string;
  status: ModerationStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  artist: Artist;
  user?: PlaylistUser & { email: string | null; role: UserRole };
}

export interface ArtistStudioSummary {
  claims: ArtistClaim[];
  approvedArtists: Artist[];
  stats: {
    tracks: number;
    likes: number;
    playlistAdds: number;
    pendingTracks: number;
    averagePopularity: number;
  };
}

export interface AdminSummary {
  users: number;
  artists: number;
  tracks: number;
  playlists: number;
  pendingArtistClaims: number;
  pendingTrackSubmissions: number;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  createdAt: string;
  _count?: {
    playlists: number;
    libraryItems: number;
    artistClaims: number;
  };
}

export interface SavedAlbum {
  id: string;
  userId: string;
  albumId: string;
  savedAt: string;
  album: Album;
}

export interface SearchResults {
  tracks?: Track[];
  albums?: Album[];
  artists?: Artist[];
  playlists?: Playlist[];
}
