import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@/features/auth/account";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { inviteLink } from "@/lib/hosts";
import { requireSupabase } from "@/lib/supabase";

type Level = Exclude<Role, "founder">;

/** What each level opens. The founder level is never handed out. */
export const LEVELS: readonly (readonly [Level, string])[] = [
  ["sales", "Producer level: every client, plans, approvals, the pipeline"],
  ["editor", "Editor level: the clients you tick, writing, videos"],
  ["assistant", "Production level: the clients you tick, shoot days"],
];

/** The titles people have at Gecko, each with the level it usually comes with. */
export const TITLES: readonly (readonly [string, Level])[] = [
  ["Producer", "sales"],
  ["Project manager", "sales"],
  ["Creative strategist", "sales"],
  ["Copywriter", "editor"],
  ["Main editor", "editor"],
  ["Second editor", "editor"],
  ["Freelance editor", "editor"],
  ["Graphic designer", "editor"],
  ["Web developer", "editor"],
  ["Director / DOP", "assistant"],
  ["Production manager", "assistant"],
  ["Coordinator", "assistant"],
  ["On-set assistant", "assistant"],
];

/** The usual level for a title; editor for a title of your own. */
export const levelFor = (title: string): Level =>
  TITLES.find(([t]) => t === title)?.[1] ?? "editor";

/** The founder changes someone's title or level. */
export function useSetMemberRole() {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; role: Level; title: string }) => {
      const { error } = await requireSupabase().rpc("set_member_role", {
        p_workspace_id: workspaceId,
        p_member_id: input.memberId,
        p_role: input.role,
        p_title: input.title,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}

/** Creates a one-time team invite for that email and returns the link to send. */
export function useInviteMember() {
  const { id: workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async ({
      email,
      role,
      title,
    }: {
      email: string;
      role: string;
      title: string;
    }): Promise<string> => {
      const { data, error } = await requireSupabase().rpc("invite_workspace_member", {
        p_workspace_id: workspaceId,
        p_email: email,
        p_role: role,
        p_title: title,
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
