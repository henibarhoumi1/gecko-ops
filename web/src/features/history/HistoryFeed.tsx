import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { clientReadData } from "@/lib/preview";
import { requireSupabase } from "@/lib/supabase";
import { byDay, verb, whoDid, type HistoryEvent } from "./model";

/**
 * Who did what on this client, newest first: the last 120 days. Same page for the team and the client;
 * the client sees their side of it.
 */
export function HistoryFeed({
  workspaceId,
  clientId,
  reader,
  base,
}: {
  workspaceId: string;
  clientId: string;
  reader: "client" | "team";
  /** Prefix for links: "/clients/<id>" for the team, "" in the portal. */
  base: string;
}) {
  const history = useQuery({
    queryKey: ["history", workspaceId, clientId, reader],
    queryFn: async (): Promise<HistoryEvent[]> => {
      const args = { p_workspace_id: workspaceId, p_client_id: clientId };
      if (reader === "client")
        return ((await clientReadData("get_client_history", args)) ?? []) as HistoryEvent[];
      const { data, error } = await requireSupabase().rpc("get_client_history", args);
      if (error) throw error;
      return (data ?? []) as HistoryEvent[];
    },
    refetchInterval: 60_000,
  });
  if (history.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (history.isError) return <Notice tone="error">{friendlyError(history.error)}</Notice>;
  const days = byDay(history.data);
  const locale = t("en-GB", "fr-FR");
  return (
    <section className="tab-body history">
      <p className="lede">
        {t(
          "Who did what, newest first, over the last four months.",
          "Qui a fait quoi, du plus récent au plus ancien, sur les quatre derniers mois.",
        )}
      </p>
      {days.length === 0 && (
        <p className="empty-state">{t("Nothing yet.", "Rien pour l'instant.")}</p>
      )}
      {days.map((d) => (
        <div key={d.day} className="history-day">
          <h2 className="history-date">
            {new Date(`${d.day}T12:00:00`).toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <ul>
            {d.events.map((e, i) => (
              <li
                key={`${e.at}-${e.kind}-${i}`}
                className={`history-item kind-${e.kind}${e.client ? " by-client" : ""}`}
              >
                <span className="history-time small muted">
                  {new Date(e.at).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>
                  <strong>{whoDid(e, reader)}</strong> {verb(e.kind)}{" "}
                  {e.kind === "removed" && reader === "team" ? (
                    <Link to="/trash">“{e.title}”</Link>
                  ) : (
                    <Link to={`${base}${e.link}`} dir="auto">
                      “{e.title}”
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
