import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { previewRole } from "@/lib/preview";
import { requireSupabase } from "@/lib/supabase";
import { hereLine, initials, pagePath, type Present } from "./model";

/**
 * Who else has this page open. Pings every 20 seconds while the tab is visible; nothing in View as client.
 */
export function Presence({
  workspaceId,
  clientId,
  reader,
}: {
  workspaceId: string;
  clientId: string;
  reader: "client" | "team";
}) {
  const { pathname } = useLocation();
  const path = pagePath(pathname, clientId);
  const here = useQuery({
    queryKey: ["presence", workspaceId, clientId, path],
    queryFn: async (): Promise<Present[]> => {
      const { data, error } = await requireSupabase().rpc("ping_presence", {
        p_workspace_id: workspaceId,
        p_client_id: clientId,
        p_path: path,
      });
      if (error) throw error;
      return data as Present[];
    },
    enabled: !previewRole() && Boolean(workspaceId && clientId),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const people = here.data ?? [];
  if (people.length === 0) return null;
  return (
    <div className="presence" role="status">
      <span className="presence-faces" aria-hidden="true">
        {people.slice(0, 4).map((p) => (
          <span key={p.name} className={`presence-face${p.team ? " team" : ""}`} title={p.name}>
            {initials(p.name)}
          </span>
        ))}
      </span>
      <span className="small">{hereLine(people, reader)}</span>
    </div>
  );
}
