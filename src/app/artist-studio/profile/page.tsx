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

export default function ArtistProfilePage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["artist-studio-summary"],
    queryFn: api.artistStudio.summary,
  });
  const artists = data?.approvedArtists ?? [];
  const [artistId, setArtistId] = useState("");
  const activeArtistId = artistId || artists[0]?.id || "";
  const selected = artists.find((artist) => artist.id === activeArtistId);
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: api.artistStudio.profile.update,
    onSuccess: () => {
      setMessage("Artist profile updated.");
      queryClient.invalidateQueries({ queryKey: ["artist-studio-summary"] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeArtistId) return;
    const formData = new FormData(event.currentTarget);
    mutation.mutate({
      artistId: activeArtistId,
      bio: String(formData.get("bio") ?? "").trim() || null,
      imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
    });
  }

  return (
    <RoleGate allowed={["ARTIST", "ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <Typography variant="h1">Artist Profile</Typography>
        </FadeIn>

        <FadeIn delay={0.05}>
        <GlassWindow intensity="medium" className="p-6">
          {artists.length === 0 ? (
            <Typography variant="body" color="muted">
              You need an approved artist claim before you can edit an artist profile.
            </Typography>
          ) : (
            <form onSubmit={submit} className="space-y-4 max-w-2xl">
              <select
                value={activeArtistId}
                onChange={(event) => setArtistId(event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-accent"
              >
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </select>
              <textarea
                key={`${selected?.id ?? "artist"}-bio`}
                name="bio"
                defaultValue={selected?.bio ?? ""}
                className="w-full min-h-36 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                placeholder="Artist bio"
              />
              <input
                key={`${selected?.id ?? "artist"}-image`}
                name="imageUrl"
                defaultValue={selected?.imageUrl ?? ""}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                placeholder="https://example.com/artist-image.jpg"
              />
              {message && (
                <Typography variant="caption" className={message.includes("updated") ? "text-emerald-400" : "text-red-400"}>
                  {message}
                </Typography>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          )}
        </GlassWindow>
        </FadeIn>
      </div>
      </PageTransition>
    </RoleGate>
  );
}
