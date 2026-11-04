import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { locale, t } from "@/lib/i18n";
import { isPreviewing } from "@/lib/previewGuard";
import { requireSupabase } from "@/lib/supabase";
import { newsLines, type News } from "./news";

interface Target {
  workspaceId: string;
  clientId: string;
}

/** Records the visit once per page load and returns what Gecko did since the visit before. */
function useNews(target: Target) {
  return useQuery({
    queryKey: ["portal-news", target.workspaceId, target.clientId],
    queryFn: async (): Promise<News> => {
      const { data, error } = await requireSupabase().rpc("client_portal_visit", {
        p_workspace_id: target.workspaceId,
        p_client_id: target.clientId,
      });
      if (error) throw error;
      return data as News;
    },
    // A preview never records a visit for the client, and the database refuses it anyway.
    enabled: !isPreviewing(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** A short strip on Home: "Since your last visit on Mon 2 Nov: 2 new scripts to read · 1 reply from Gecko". */
export function SinceLastVisit({ target }: { target: Target }) {
  const news = useNews(target);
  if (!news.data?.since) return null;
  const lines = newsLines(news.data);
  if (lines.length === 0) return null;
  const day = new Date(news.data.since).toLocaleDateString(locale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return (
    <section className="since-visit" aria-label={t("New since your last visit", "Nouveau depuis votre dernière visite")}>
      <p className="since-visit-head">
        {t(`New since your last visit, ${day}`, `Nouveau depuis votre dernière visite, ${day}`)}
      </p>
      <ul>
        {lines.map((l) => (
          <li key={l.label}>{l.to ? <Link to={l.to}>{l.label}</Link> : <span>{l.label}</span>}</li>
        ))}
      </ul>
    </section>
  );
}
