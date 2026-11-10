import { setPreviewing } from "./previewGuard";
import { requireSupabase } from "./supabase";

// "View as client": the Gecko owner or a producer opens a client's portal as a chosen client role,
// read-only (supabase/migrations/202611120001_view_as_client.sql). In that page, the portal's reads go
// through team_preview, which applies exactly the client's rules for that role. Writes are refused by the
// database, so the preview can't change anything.

export type PreviewRole = "owner" | "approver" | "finance" | "viewer";
export const PREVIEW_ROLES: PreviewRole[] = ["owner", "approver", "finance", "viewer"];

let preview: PreviewRole | null = null;

export function setPreviewRole(role: PreviewRole | null): void {
  preview = role;
  setPreviewing(role !== null);
}

export function previewRole(): PreviewRole | null {
  return preview;
}

/** The address of a client's preview: /preview/<client>/<role>. */
export function previewPath(clientId: string, role: PreviewRole = "owner"): string {
  return `/preview/${encodeURIComponent(clientId)}/${role}`;
}

/** Reads the client and role from a preview address, or null for any other address. */
export function parsePreviewPath(path: string): { clientId: string; role: PreviewRole } | null {
  const match = /^\/preview\/([^/]+)\/(owner|approver|finance|viewer)(?:\/|$)/.exec(path);
  if (!match) return null;
  return { clientId: decodeURIComponent(match[1]!), role: match[2] as PreviewRole };
}

const PREVIEW_READS: Record<string, string> = {
  get_my_portal: "portal",
  get_my_team: "team",
  get_my_production: "production",
  get_my_cuts: "cuts",
  get_my_invoices: "invoices",
  get_shoot_days: "shoot",
  get_tasks: "tasks",
};

/** A portal read: the client's own function, or the same read as a preview when previewing. */
export function clientRead(
  name: keyof typeof PREVIEW_READS,
  args: { p_workspace_id: string; p_client_id: string },
) {
  const db = requireSupabase();
  if (!preview) return db.rpc(name, args);
  return db.rpc("team_preview", { ...args, p_role: preview, p_read: PREVIEW_READS[name] });
}

/** clientRead, returning the data and throwing on error. */
export async function clientReadData(
  name: keyof typeof PREVIEW_READS,
  args: { p_workspace_id: string; p_client_id: string },
): Promise<unknown> {
  const { data, error } = await clientRead(name, args);
  if (error) throw error;
  return data as unknown;
}
