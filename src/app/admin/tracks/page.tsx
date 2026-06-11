"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleGate } from "@/components/ui/RoleGate";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { PageTransition } from "@/components/ui/PageTransition";
import { FadeIn } from "@/components/ui/FadeIn";
import { api } from "@/lib/api";
import type { ModerationStatus } from "@/types/api";

export default function AdminTracksPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-tracks"],
    queryFn: () => api.admin.tracks.list(),
  });
  const mutation = useMutation({
    mutationFn: ({ trackId, status }: { trackId: string; status: ModerationStatus }) =>
      api.admin.tracks.update(trackId, status),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
  });

  return (
    <RoleGate allowed={["ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <Typography variant="h1">Track Submissions</Typography>
        </FadeIn>
        <FadeIn delay={0.05}>
        <GlassWindow intensity="medium" className="p-6 space-y-3">
          {data?.data.map((track) => (
            <div key={track.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-lg bg-white/5 p-4">
              <div className="min-w-0">
                <Typography variant="h4" className="truncate">{track.trackName}</Typography>
                <Typography variant="caption" color="muted">
                  {track.albumName} · {track.artists}
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <Typography variant="caption" className="text-accent mr-2">{track.moderationStatus}</Typography>
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ trackId: track.id, status: "APPROVED" })}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ trackId: track.id, status: "REJECTED" })}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {data?.data.length === 0 && (
            <Typography variant="body" color="muted">No submitted tracks to review.</Typography>
          )}
        </GlassWindow>
        </FadeIn>
      </div>
      </PageTransition>
    </RoleGate>
  );
}
