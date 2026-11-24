// Active projects (Heni, 24 Nov 2026): every running campaign across clients on one page — where it is, what's
// next and when, what waits on the client — so nothing is forgotten between clients. Open one to land in its
// workspace.
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/features/clients/clientsApi";
import { StageTrack, stageOf } from "@/features/today/HomeMore";
import { byClient, daysSince } from "@/features/today/model";
import { useToday } from "@/features/today/todayApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";
import { setProjectChoice } from "./projectChoice";
import { normaliseProjects, type Project } from "./projectsApi";

const STAGES = ["Ideas", "Scripts", "Shoot", "Edit", "Deliver"];

const shortDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function ActiveProjectsPage() {
  const { id: workspaceId, role } = useWorkspace();
  const lead = role === "founder" || role === "sales";
  const clients = useClients();
  const today = useToday();
  const navigate = useNavigate();
  const [stage, setStage] = useState<number | null>(null);
  const [sort, setSort] = useState<"next" | "client" | "stage">("next");
  const list = clients.data ?? [];
  const todayIso = new Date().toISOString().slice(0, 10);

  const qs = useQueries({
    queries: list.map((c) => ({
      queryKey: ["projects", workspaceId, c.id],
      queryFn: async () => {
        const { data, error } = await requireSupabase().rpc("get_projects", {
          p_workspace_id: workspaceId,
          p_client_id: c.id,
        });
        if (error) throw error;
        return normaliseProjects(data);
      },
    })),
  });
  const loading = clients.isPending || qs.some((q) => q.isPending);
  const waiting = byClient(today.data?.client ?? []);

  const rows = list.flatMap((c, i) =>
    (qs[i]?.data?.projects ?? [])
      .filter((p) => p.status === "active")
      .map((p: Project) => {
        const w = waiting.find((g) => g.client_id === c.id);
        return {
          client: c,
          p,
          at: stageOf(p, todayIso),
          waitingDays: w ? daysSince(w.oldest) : 0,
          waitingCount: w ? w.items.length : 0,
        };
      }),
  );
  const shown = rows
    .filter((r) => stage === null || r.at === stage)
    .sort((a, b) =>
      sort === "client"
        ? a.client.brand.localeCompare(b.client.brand)
        : sort === "stage"
          ? a.at - b.at
          : (a.p.nextShoot ?? "9999").localeCompare(b.p.nextShoot ?? "9999"),
    );

  const open = (clientId: string, projectId: string) => {
    setProjectChoice(workspaceId, clientId, projectId);
    navigate(`/clients/${encodeURIComponent(clientId)}/room`);
  };

  return (
    <section className="page wide active-projects">
      <header className="page-head ceo-head">
        <div>
          <h1>Active campaigns</h1>
          <p className="lede">
            {loading
              ? "Gathering every campaign…"
              : `${rows.length} running across ${new Set(rows.map((r) => r.client.id)).size} clients.`}
          </p>
        </div>
        <div className="seg" role="group" aria-label="Sort">
          {(
            [
              ["next", "Next shoot"],
              ["stage", "Stage"],
              ["client", "Client"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="stage-filter" role="group" aria-label="Stage">
        <button type="button" aria-pressed={stage === null} onClick={() => setStage(null)}>
          All <span className="count">{rows.length}</span>
        </button>
        {STAGES.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-pressed={stage === i}
            onClick={() => setStage(stage === i ? null : i)}
          >
            {s} <span className="count">{rows.filter((r) => r.at === i).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ap-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ap-card skeleton-card" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="empty-state">
          {rows.length === 0
            ? "No active campaigns. Start one from a client's page."
            : "Nothing at this stage."}
        </p>
      ) : (
        <div className="ap-grid">
          {shown.map(({ client, p, at, waitingDays, waitingCount }) => {
            const days = p.nextShoot
              ? Math.round(
                  (Date.parse(p.nextShoot.slice(0, 10)) - Date.parse(todayIso)) / 86_400_000,
                )
              : null;
            return (
              <button
                key={p.id}
                type="button"
                className="ap-card"
                onClick={() => open(client.id, p.id)}
              >
                <span className="ap-top">
                  <span className="ap-client" dir="auto">
                    {client.brand}
                  </span>
                  <span className={`ap-kind kind-${p.kind}`}>
                    {p.kind === "cinematic" ? "Film" : "Ads"}
                  </span>
                </span>
                <strong className="ap-name" dir="auto">
                  {p.name}
                </strong>
                <StageTrack at={at} />
                <span className="ap-facts">
                  <span>
                    <strong>{p.ideas}</strong> ideas
                  </span>
                  <span>
                    <strong>
                      {p.approved}/{p.scripts}
                    </strong>{" "}
                    scripts
                  </span>
                  <span>
                    <strong>{p.reels}</strong> reels
                  </span>
                </span>
                <span className="ap-bottom">
                  <span
                    className={`ap-next${days !== null && days <= 3 && days >= 0 ? " is-soon" : ""}`}
                  >
                    {p.nextShoot
                      ? `Shoot ${shortDay(p.nextShoot)}${days !== null && days >= 0 ? ` · in ${days} ${days === 1 ? "day" : "days"}` : ""}`
                      : "No shoot planned"}
                  </span>
                  {lead && waitingCount > 0 && (
                    <span className={`ap-wait${waitingDays >= 7 ? " is-late" : ""}`}>
                      {waitingCount} with the client · {waitingDays} d
                    </span>
                  )}
                </span>
                <span className="ap-open" aria-hidden="true">
                  Open →
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
