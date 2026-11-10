import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import type { Proposal, ProposalContent } from "./proposal";

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as unknown;
}

export function useProposals(leadId: string) {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["proposals", workspaceId, leadId],
    queryFn: async () =>
      (await rpc("get_lead_proposals", {
        p_workspace_id: workspaceId,
        p_lead_id: leadId,
      })) as Proposal[],
    refetchInterval: 60_000,
  });
}

export function useProposalActions(leadId: string) {
  const { id: workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ["proposals", workspaceId, leadId] });
    // Sending moves the lead on.
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
  };
  return {
    save: useMutation({
      mutationFn: async ({ id, content }: { id: string | null; content: ProposalContent }) =>
        (await rpc("save_proposal", {
          p_workspace_id: workspaceId,
          p_lead_id: leadId,
          p_id: id,
          p_content: content,
        })) as string,
      onSettled: done,
    }),
    link: useMutation({
      mutationFn: async (id: string) =>
        (await rpc("create_proposal_link", {
          p_workspace_id: workspaceId,
          p_id: id,
          p_days: 30,
        })) as string,
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) => rpc("remove_proposal", { p_workspace_id: workspaceId, p_id: id }),
      onSettled: done,
    }),
  };
}
