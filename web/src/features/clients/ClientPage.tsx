import { useMemo } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Notice } from "@/components/Notice";
import { useActiveTabInView } from "@/components/useActiveTabInView";
import { BoardRoute } from "@/features/board/BoardRoute";
import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { TeamVideos } from "@/features/videos/TeamVideos";
import { videosOn } from "@/lib/features";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { useClients, useLogos } from "./clientsApi";
import { LogoPanel } from "./LogoPanel";
import { LoginsPanel } from "./LoginsPanel";
import { OverviewEditor } from "./OverviewEditor";
import { TeamConcepts } from "./TeamConcepts";
import { TeamScripts } from "./TeamScripts";
import { TeamShared } from "./TeamShared";

/** One client's portal, from the team's side. */
export function ClientPage() {
  const { clientId = "" } = useParams();
  const workspace = useWorkspace();
  const clients = useClients();
  useActiveTabInView(clients.isSuccess);
  const target = useMemo(() => ({ workspaceId: workspace.id, clientId }), [workspace.id, clientId]);
  const onBoard = useLocation().pathname.includes("/board");
  const lead = workspace.role === "founder" || workspace.role === "sales";
  const logos = useLogos();

  if (clients.isPending) return <p className="loading">Loading…</p>;
  if (clients.isError) return <Notice tone="error">{friendlyError(clients.error)}</Notice>;
  const client = clients.data.find((c) => c.id === clientId);
  if (!client) return <Navigate to="/clients" replace />;

  const videos = videosOn ? [["videos", "Videos"]] : [];
  const tabs = lead
    ? [
        ["", "Overview"],
        ["concepts", "Ideas"],
        ["scripts", "Scripts"],
        ...videos,
        ["board", "Board"],
        ["shared", "Shared"],
        ["onboarding", "Onboarding"],
        ["logins", "Client logins"],
      ]
    : [
        ["concepts", "Ideas"],
        ["scripts", "Scripts"],
        ...videos,
        ["board", "Board"],
        ["shared", "Shared"],
      ];

  return (
    <section className={`page${onBoard ? " board-page" : ""}`}>
      <p className="small">
        <Link to="/clients">← Clients</Link>
      </p>
      <h1 className="client-title">
        {logos.data?.[clientId] && (
          <img className="client-title-logo" src={logos.data[clientId]} alt="" />
        )}
        {client.brand}
      </h1>
      <nav className="portal-tabs" aria-label={client.brand}>
        {tabs.map(([path, label]) => (
          <NavLink
            key={path}
            to={`/clients/${clientId}${path ? `/${path}` : ""}`}
            end={path !== "board"}
            className="portal-tab"
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        {lead ? (
          <>
            <Route
              index
              element={
                <>
                  <LogoPanel clientId={clientId} brand={client.brand} />
                  <OverviewEditor clientId={clientId} />
                </>
              }
            />
            <Route
              path="onboarding"
              element={
                <section className="tab-body">
                  <p className="lede">
                    The client fills this in their portal. Fill it in together on a call: both
                    screens update within a few seconds.
                  </p>
                  <OnboardingForm target={target} brand={client.brand} mode="team" />
                </section>
              }
            />
            <Route
              path="logins"
              element={<LoginsPanel clientId={clientId} brand={client.brand} />}
            />
          </>
        ) : (
          <Route index element={<Navigate to="concepts" replace />} />
        )}
        <Route path="concepts" element={<TeamConcepts clientId={clientId} />} />
        <Route path="scripts" element={<TeamScripts clientId={clientId} />} />
        <Route path="shared" element={<TeamShared clientId={clientId} />} />
        {["board", "board/:boardId"].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <BoardRoute target={target} base={`/clients/${clientId}/board`} reader="team" />
            }
          />
        ))}
        {videosOn && <Route path="videos" element={<TeamVideos clientId={clientId} />} />}
        <Route path="*" element={<Navigate to={`/clients/${clientId}`} replace />} />
      </Routes>
    </section>
  );
}
