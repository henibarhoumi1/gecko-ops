import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@/features/auth/account";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { inviteLink } from "@/lib/hosts";
import { requireSupabase } from "@/lib/supabase";

/** Roles the founder can invite. The founder role is never handed out. */
export const INVITE_ROLES: readonly (readonly [Exclude<Role, "founder">, string])[] = [
  ["editor", "Editor, picked clients only"],
  ["sales", "Client lead, all clients"],
];

/** Creates a one-time team invite for that email and returns the link to send. */
export function useInviteMember() {
  const { id: workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }): Promise<string> => {
      const { data, error } = await requireSupabase().rpc("invite_workspace_member", {
        p_workspace_id: workspaceId,
        p_email: email,
        p_role: role,
      });
      if (error) throw error;
      return inviteLink("team", String(data));
    },
  });
}

export function useRemoveMember() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await requireSupabase().rpc("remove_workspace_member", {
        p_workspace_id: workspaceId,
        p_member_id: memberId,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}

interface AssignmentRow {
  type: "client" | "project";
  entityId: string;
  memberId: string;
}

/** Which clients each editor can open. Founder only. */
export function useClientAssignments(enabled: boolean) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["assignments", workspaceId],
    enabled,
    queryFn: async (): Promise<Map<string, Set<string>>> => {
      const { data, error } = await requireSupabase().rpc("get_workspace_assignments", {
        p_workspace_id: workspaceId,
      });
      if (error) throw error;
      const byMember = new Map<string, Set<string>>();
      for (const row of data as AssignmentRow[]) {
        if (row.type !== "client") continue;
        byMember.set(row.memberId, (byMember.get(row.memberId) ?? new Set()).add(row.entityId));
      }
      return byMember;
    },
  });
}

export function useAssignClient() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; clientId: string; assigned: boolean }) => {
      const { error } = await requireSupabase().rpc("assign_client_member", {
        p_workspace_id: workspaceId,
        p_client_id: input.clientId,
        p_member_id: input.memberId,
        p_assigned: input.assigned,
      });
      if (error) throw error;
    },
    // Tick the box right away; the refetch below puts it back if the database said no.
    onMutate: (input) => {
      const key = ["assignments", workspaceId];
      queryClient.setQueryData<Map<string, Set<string>>>(key, (old) => {
        const next = new Map(old ?? []);
        const clients = new Set(next.get(input.memberId) ?? []);
        if (input.assigned) clients.add(input.clientId);
        else clients.delete(input.clientId);
        return next.set(input.memberId, clients);
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["assignments", workspaceId] }),
  });
}
