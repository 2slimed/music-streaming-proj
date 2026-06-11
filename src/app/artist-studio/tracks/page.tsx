"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleGate } from "@/components/ui/RoleGate";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { FadeIn } from "@/components/ui/FadeIn";
import { api } from "@/lib/api";

export default function ArtistTracksPage() {
  const queryClient = useQueryClient();
  const { data: summary } = useQuery({
    queryKey: ["artist-studio-summary"],
    queryFn: api.artistStudio.summary,
  });
  const { data: tracksData } = useQuery({
    queryKey: ["artist-studio-tracks"],
    queryFn: () => api.artistStudio.tracks.list(),
  });

  const artists = summary?.approvedArtists ?? [];
  const [artistId, setArtistId] = useState("");
  const activeArtistId = artistId || artists[0]?.id || "";
  const [form, setForm] = useState({
    trackName: "",
    albumName: "",
    durationMs: 180000,
    explicit: false,
    danceability: 0.5,
    energy: 0.5,
    previewUrl: "",
    coverUrl: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: api.artistStudio.tracks.create,
    onSuccess: () => {
      setMessage("Track submitted for admin approval.");
      setForm((current) => ({ ...current, trackName: "", albumName: "", previewUrl: "", coverUrl: "" }));
      queryClient.invalidateQueries({ queryKey: ["artist-studio-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["artist-studio-summary"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeArtistId) {
      setMessage("You need an approved artist claim before submitting tracks.");
      return;
    }
    mutation.mutate({ artistId: activeArtistId, ...form });
  }

  return (
    <RoleGate allowed={["ARTIST", "ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <Typography variant="h1">Artist Tracks</Typography>
        </FadeIn>

        <FadeIn delay={0.05}>
        <GlassWindow intensity="medium" className="p-6">
          <Typography variant="h3" className="mb-5">Submit Track</Typography>
          {artists.length === 0 ? (
            <Typography variant="body" color="muted">
              You need an approved artist claim before submitting tracks.
            </Typography>
          ) : (
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={activeArtistId}
                onChange={(event) => setArtistId(event.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent md:col-span-2"
              >
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>{artist.name}</option>
                ))}
              </select>
              <input
                value={form.trackName}
                onChange={(event) => setForm({ ...form, trackName: event.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                placeholder="Track name"
              />
              <input
                value={form.albumName}
                onChange={(event) => setForm({ ...form, albumName: event.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                placeholder="Album name"
              />
              <input
                type="number"
                min={1}
                max={600000}
                value={form.durationMs}
                onChange={(event) => setForm({ ...form, durationMs: Number(event.target.value) })}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent"
                placeholder="Duration in ms"
              />
              <label className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.explicit}
                  onChange={(event) => setForm({ ...form, explicit: event.target.checked })}
                />
                Explicit
              </label>
              <label className="space-y-2">
                <Typography variant="caption" color="muted">Danceability: {form.danceability}</Typography>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.danceability}
                  onChange={(event) => setForm({ ...form, danceability: Number(event.target.value) })}
                  className="w-full"
                />
              </label>
              <label className="space-y-2">
                <Typography variant="caption" color="muted">Energy: {form.energy}</Typography>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.energy}
                  onChange={(event) => setForm({ ...form, energy: Number(event.target.value) })}
                  className="w-full"
                />
              </label>
              <input
                value={form.previewUrl}
                onChange={(event) => setForm({ ...form, previewUrl: event.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent md:col-span-2"
                placeholder="HTTPS preview URL"
              />
              <input
                value={form.coverUrl}
                onChange={(event) => setForm({ ...form, coverUrl: event.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent md:col-span-2"
                placeholder="HTTPS cover image URL"
              />
              {message && (
                <Typography variant="caption" className={`md:col-span-2 ${message.includes("submitted") ? "text-emerald-400" : "text-red-400"}`}>
                  {message}
                </Typography>
              )}
              <Button type="submit" disabled={mutation.isPending} className="md:col-span-2 max-w-xs">
                {mutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </form>
          )}
        </GlassWindow>
        </FadeIn>

        <FadeIn delay={0.1}>
        <GlassWindow intensity="light" className="p-6">
          <Typography variant="h3" className="mb-4">My Submitted Tracks</Typography>
          <div className="space-y-2">
            {tracksData?.data.map((track) => (
              <div key={track.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg bg-white/5 p-4">
                <div>
                  <Typography variant="body">{track.trackName}</Typography>
                  <Typography variant="caption" color="muted">{track.albumName} · {track.artists}</Typography>
                </div>
                <Typography variant="caption" className="text-accent">{track.moderationStatus}</Typography>
              </div>
            ))}
            {tracksData?.data.length === 0 && (
              <Typography variant="body" color="muted">No submitted tracks yet.</Typography>
            )}
          </div>
        </GlassWindow>
        </FadeIn>
      </div>
      </PageTransition>
    </RoleGate>
  );
}
