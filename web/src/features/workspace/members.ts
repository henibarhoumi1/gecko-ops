import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import type { Role } from "@/features/auth/account";
import { useWorkspace } from "./WorkspaceContext";

export interface Member {
  id: string;
  name: string;
  role: Role;
}

/** Active team members, for owner pickers and names on cards. */
export function useMembers() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await requireSupabase().rpc("get_workspace_records", {
        p_workspace_id: workspaceId,
        p_collection: "team",
      });
      if (error) throw error;
      return (data as Member[]).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 5 * 60_000,
  });
}
