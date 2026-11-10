import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import type { Role } from "@/features/auth/account";
import { useWorkspace } from "./WorkspaceContext";

export interface Member {
  id: string;
  name: string;
  role: Role;
  /** What they do: "Main editor", "Project manager"… Empty for people from before titles. */
  title?: string;
  /** Only set on the signed-in person's own row. */
  userId?: string | null;
}

export const ROLE_LABEL: Record<Role, string> = {
  founder: "Founder",
  sales: "Producer",
  editor: "Editor",
  assistant: "Production",
};

/** Active team members, for owner pickers and names on cards. */
export function useMembers() {
  const { id: workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async (): Promise<Member[]> => {
      const db = requireSupabase();
      const { data, error } = await db.rpc("get_members", { p_workspace_id: workspaceId });
      if (!error) return (data as Member[]).sort((a, b) => a.name.localeCompare(b.name));
      // A database without titles yet: the list as before.
      const old = await db.rpc("get_workspace_records", {
        p_workspace_id: workspaceId,
        p_collection: "team",
      });
      if (old.error) throw old.error;
      return (old.data as Member[]).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 5 * 60_000,
  });
}

/** What to call someone: their title, or else their level. */
export const memberLabel = (m: Pick<Member, "role" | "title">) =>
  m.title?.trim() || ROLE_LABEL[m.role];
