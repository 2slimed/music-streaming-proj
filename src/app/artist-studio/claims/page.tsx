"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleGate } from "@/components/ui/RoleGate";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { FadeIn } from "@/components/ui/FadeIn";
import { api } from "@/lib/api";
import { Search, UserRound } from "lucide-react";

export default function ArtistClaimsPage() {
  const queryClient = useQueryClient();
  const [artistId, setArtistId] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [debouncedArtistQuery, setDebouncedArtistQuery] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedArtistQuery(artistQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [artistQuery]);

  const { data: artistsData, isFetching: searchingArtists } = useQuery({
    queryKey: ["claimable-artists", debouncedArtistQuery],
    queryFn: () => api.artists.list({ limit: 8, q: debouncedArtistQuery || undefined }),
    placeholderData: (previous) => previous,
  });
  const { data: claimsData } = useQuery({
    queryKey: ["artist-claims"],
    queryFn: api.artistStudio.claims.list,
  });

  const claimMutation = useMutation({
    mutationFn: api.artistStudio.claims.create,
    onSuccess: () => {
      setArtistId("");
      setArtistQuery("");
      setDebouncedArtistQuery("");
      setNote("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["artist-claims"] });
      queryClient.invalidateQueries({ queryKey: ["artist-studio-summary"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!artistId) {
      setError("Choose an artist to claim.");
      return;
    }
    claimMutation.mutate({ artistId, note: note.trim() || undefined });
  }

  return (
    <RoleGate allowed={["LISTENER", "ARTIST", "ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <Typography variant="h1">Artist Claims</Typography>
        </FadeIn>

        <FadeIn delay={0.05}>
        <GlassWindow intensity="medium" className="p-6">
          <Typography variant="h3" className="mb-5">Claim an Existing Artist</Typography>
          <form onSubmit={submitClaim} className="space-y-4 max-w-2xl">
            <div className="space-y-3">
              <label htmlFor="artist-search" className="block text-sm text-muted">
                Search artist
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="artist-search"
                  value={artistQuery}
                  onChange={(event) => {
                    setArtistQuery(event.target.value);
                    setArtistId("");
                    setError(null);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-11 pr-4 text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                  placeholder="Type your artist name"
                />
              </div>
              {searchingArtists && (
                <Typography variant="caption" color="muted">
                  Searching...
                </Typography>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {artistsData?.data.map((artist) => {
                  const selected = artist.id === artistId;
                  return (
                    <button
                      key={artist.id}
                      type="button"
                      onClick={() => {
                        setArtistId(artist.id);
                        setArtistQuery(artist.name);
                        setError(null);
                      }}
                      className={`flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-accent bg-accent/15"
                          : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
                          <UserRound className="h-5 w-5 text-accent" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {artist.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {artist.nbFan?.toLocaleString() ?? 0} fans
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {artistsData?.data.length === 0 && (
                <Typography variant="caption" color="muted">
                  No artists found. Try a different spelling.
                </Typography>
              )}
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full min-h-28 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
              placeholder="Optional note for the admin"
            />
            {error && <Typography variant="caption" className="text-red-400">{error}</Typography>}
            <Button type="submit" disabled={claimMutation.isPending}>
              {claimMutation.isPending ? "Submitting..." : "Submit Claim"}
            </Button>
          </form>
        </GlassWindow>
        </FadeIn>

        <FadeIn delay={0.1}>
        <GlassWindow intensity="light" className="p-6">
          <Typography variant="h3" className="mb-4">My Claims</Typography>
          <div className="space-y-2">
            {claimsData?.data.map((claim) => (
              <div key={claim.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg bg-white/5 p-4">
                <div>
                  <Typography variant="body">{claim.artist.name}</Typography>
                  {claim.note && <Typography variant="caption" color="muted">{claim.note}</Typography>}
                </div>
                <Typography variant="caption" className="text-accent">{claim.status}</Typography>
              </div>
            ))}
            {claimsData?.data.length === 0 && (
              <Typography variant="body" color="muted">No artist claims yet.</Typography>
            )}
          </div>
        </GlassWindow>
        </FadeIn>
      </div>
      </PageTransition>
    </RoleGate>
  );
}
