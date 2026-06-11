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

export default function AdminArtistClaimsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-artist-claims"],
    queryFn: () => api.admin.artistClaims.list(),
  });
  const mutation = useMutation({
    mutationFn: ({ claimId, status }: { claimId: string; status: ModerationStatus }) =>
      api.admin.artistClaims.update(claimId, status),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-artist-claims"] });
      queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
  });

  return (
    <RoleGate allowed={["ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <Typography variant="h1">Artist Claims</Typography>
        </FadeIn>
        <FadeIn delay={0.05}>
        <GlassWindow intensity="medium" className="p-6 space-y-3">
          {data?.data.map((claim) => (
            <div key={claim.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-lg bg-white/5 p-4">
              <div>
                <Typography variant="h4">{claim.artist.name}</Typography>
                <Typography variant="caption" color="muted">
                  Requested by {claim.user?.name ?? "Unknown"} · {claim.user?.email ?? "No email"}
                </Typography>
                {claim.note && <Typography variant="body" color="muted" className="mt-2">{claim.note}</Typography>}
              </div>
              <div className="flex items-center gap-2">
                <Typography variant="caption" className="text-accent mr-2">{claim.status}</Typography>
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ claimId: claim.id, status: "APPROVED" })}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ claimId: claim.id, status: "REJECTED" })}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {data?.data.length === 0 && (
            <Typography variant="body" color="muted">No artist claims to review.</Typography>
          )}
        </GlassWindow>
        </FadeIn>
      </div>
      </PageTransition>
    </RoleGate>
  );
}
