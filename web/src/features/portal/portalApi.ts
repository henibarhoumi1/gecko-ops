import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientPortal } from "@/features/auth/account";

/** The client-safe page the agency last published. Only the fields this screen reads are typed. */
export interface PortalSnapshot {
  brand?: { name?: string };
  title?: string;
  company?: { name?: string; email?: string; phone?: string };
  projects?: { id: string; name: string; stage?: string; shootDate?: string }[];
}

export async function loadPortal(
  db: SupabaseClient,
  portal: ClientPortal,
): Promise<PortalSnapshot | null> {
  const { data, error } = await db.rpc("get_my_client_share", {
    p_workspace_id: portal.workspaceId,
    p_client_id: portal.clientId,
  });
  if (error) throw error;
  return (data as { snapshot?: PortalSnapshot } | null)?.snapshot ?? null;
}
