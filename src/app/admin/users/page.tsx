"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoleGate } from "@/components/ui/RoleGate";
import { GlassWindow } from "@/components/ui/GlassWindow";
import { Typography } from "@/components/ui/Typography";
import { PageTransition } from "@/components/ui/PageTransition";
import { FadeIn } from "@/components/ui/FadeIn";
import { api } from "@/lib/api";
import type { UserRole } from "@/types/api";

const ROLES: UserRole[] = ["LISTENER", "ARTIST", "ADMIN"];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.admin.users.list({ limit: 100 }),
  });
  const mutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api.admin.users.updateRole(userId, role),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
  });

  return (
    <RoleGate allowed={["ADMIN"]}>
      <PageTransition>
      <div className="p-6 md:p-10 space-y-8">
        <FadeIn>
        <Typography variant="h1">Users</Typography>
        </FadeIn>
        <FadeIn delay={0.05}>
        <GlassWindow intensity="medium" className="p-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-3">User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Playlists</th>
                <th>Likes</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((user) => (
                <tr key={user.id} className="border-t border-white/5">
                  <td className="py-3">{user.name ?? "Unnamed"}</td>
                  <td>{user.email ?? "No email"}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(event) =>
                        mutation.mutate({ userId: user.id, role: event.target.value as UserRole })
                      }
                      className="rounded border border-white/10 bg-[#18181b] px-3 py-2 text-foreground"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role} className="bg-[#18181b] text-white">{role}</option>
                      ))}
                    </select>
                  </td>
                  <td>{user._count?.playlists ?? 0}</td>
                  <td>{user._count?.libraryItems ?? 0}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mutation.error && (
            <Typography variant="caption" className="mt-4 block text-red-400">
              {mutation.error.message}
            </Typography>
          )}
        </GlassWindow>
        </FadeIn>
      </div>
      </PageTransition>
    </RoleGate>
  );
}
