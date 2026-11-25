// On the team's side of an idea or a script: what the client picked, and one click to take it.
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/Toast";
import { useApprovedProduction } from "@/features/clients/ShootPlan";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { Face } from "./ClientPicks";
import { useTeamPicks, type Picks } from "./picksApi";

export function TeamPicks({
  clientId,
  kind,
  id,
  shoot,
}: {
  clientId: string;
  kind: "concept" | "script";
  id: string;
  /** A script's current shoot plan, merged rather than replaced. */
  shoot?: Record<string, unknown> | undefined;
}) {
  const { id: workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const all = useTeamPicks(workspaceId, clientId);
  const production = useApprovedProduction(clientId);
  const picks: Picks | undefined = (kind === "concept" ? all.data?.concepts : all.data?.scripts)?.[
    id
  ];
  if (!picks) return null;

  const option = (x: string) => production.all.find((o) => o.id === x);
  const name = (x: string) =>
    production.named.find((o) => o.id === x)?.name ??
    all.data?.sets.find((s) => s.id === x)?.name ??
    "Removed";
  const where = picks.set ?? picks.location;

  async function take() {
    if (!picks) return;
    try {
      const db = requireSupabase();
      const { error } =
        kind === "concept"
          ? await db
              .from("concepts")
              .update({ talent: picks.talent.slice(0, 12) })
              .eq("id", id)
          : await db
              .from("scripts")
              .update({
                shoot: {
                  ...(shoot ?? {}),
                  talent: picks.talent,
                  set: where,
                  sets: where ? [where] : [],
                  props: picks.props,
                  ...(picks.note ? { extraProps: picks.note.slice(0, 500) } : {}),
                },
              })
              .eq("id", id);
      if (error) throw error;
      void qc.invalidateQueries({
        queryKey: [kind === "concept" ? "concepts" : "scripts", workspaceId],
      });
      toast({ text: "Took the client's picks" });
    } catch (e) {
      toast({ text: friendlyError(e), tone: "error" });
    }
  }

  return (
    <div className="pk-line is-team">
      <div className="pk-summary">
        <span className="pk-by">{picks.by ?? "The client"} picked</span>
        {picks.talent.length > 0 && (
          <span className="pk-faces">
            {picks.talent.map((x) => (
              <Face key={x} path={option(x)?.photos[0]} name={name(x)} size={26} />
            ))}
            <span>{picks.talent.map(name).join(", ")}</span>
          </span>
        )}
        {where && <span className="pk-where">{name(where)}</span>}
        {picks.props.length > 0 && (
          <span className="pk-props">{picks.props.map(name).join(", ")}</span>
        )}
        {picks.note && <span className="pk-note">&ldquo;{picks.note}&rdquo;</span>}
      </div>
      <button type="button" className="pk-open" onClick={() => void take()}>
        {kind === "concept" ? "Use their talent" : "Use their picks"}
      </button>
    </div>
  );
}
