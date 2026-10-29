import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "founder" | "sales" | "editor" | "assistant";

export interface Workspace {
  id: string;
  name: string;
  role: Role;
}

export interface ClientPortal {
  workspaceId: string;
  clientId: string;
  brand: string;
}

/** What a signed-in person can open: the agency workspace, their client page, or nothing yet. */
export type Account =
  | { kind: "member"; workspace: Workspace }
  | { kind: "client"; portals: ClientPortal[] }
  | { kind: "none" };

/** Team membership wins over client access, mirroring how the database grants it. */
export async function loadAccount(db: SupabaseClient): Promise<Account> {
  const workspaces = await db.rpc("get_my_workspaces");
  if (workspaces.error) throw workspaces.error;
  const first = (workspaces.data as Workspace[] | null)?.[0];
  if (first) return { kind: "member", workspace: first };

  const portals = await db.rpc("get_my_client_portals");
  if (portals.error) throw portals.error;
  const rows = (portals.data ?? []) as { workspace_id: string; client_id: string; brand: string }[];
  if (rows.length) {
    return {
      kind: "client",
      portals: rows.map((r) => ({
        workspaceId: r.workspace_id,
        clientId: r.client_id,
        brand: r.brand,
      })),
    };
  }
  return { kind: "none" };
}

/** An invite code is either a team invite or a client invite; try team first. */
export async function acceptInvite(
  db: SupabaseClient,
  code: string,
  displayName: string,
): Promise<void> {
  const team = await db.rpc("accept_workspace_invite", {
    p_token: code,
    p_display_name: displayName,
  });
  if (!team.error) return;
  if (!/invalid_invite/.test(team.error.message)) throw team.error;
  const client = await db.rpc("accept_client_invite", {
    p_token: code,
    p_display_name: displayName,
  });
  if (client.error) throw client.error;
}

export async function createWorkspace(db: SupabaseClient, name: string): Promise<void> {
  const { error } = await db.rpc("create_workspace", { p_name: name });
  if (error) throw error;
}
