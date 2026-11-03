import { useMemo } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Notice } from "@/components/Notice";
import { useActiveTabInView } from "@/components/useActiveTabInView";
import { BoardRoute } from "@/features/board/BoardRoute";
import { WhiteboardRoute } from "@/features/whiteboard/WhiteboardRoute";
import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { TeamVideos } from "@/features/videos/TeamVideos";
import { videosOn } from "@/lib/features";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { useClients, useLogos } from "./clientsApi";
import { useTemplates } from "./lookApi";
import { LogoPanel } from "./LogoPanel";
import { LookPanel } from "./LookPanel";
import { ClientNudge } from "./ClientNudge";
import { previewPath } from "@/lib/preview";
import { LoginsPanel } from "./LoginsPanel";
import { OverviewEditor } from "./OverviewEditor";
import { TeamConcepts } from "./TeamConcepts";
import { TeamScripts } from "./TeamScripts";
import { TeamShared } from "./TeamShared";
import { TeamProduction } from "./TeamProduction";
import { TeamMoney } from "./TeamMoney";
import { TeamReview } from "./TeamReview";
import { LibraryScreen } from "@/features/results/LibraryScreen";
import { ResultsScreen } from "@/features/results/ResultsScreen";

/** One client's portal, from the team's side. */
export function ClientPage() {
  const { clientId = "" } = useParams();
  const workspace = useWorkspace();
  const clients = useClients();
  useActiveTabInView(clients.isSuccess);
  const target = useMemo(() => ({ workspaceId: workspace.id, clientId }), [workspace.id, clientId]);
  const onBoard = /\/(white)?board/.test(useLocation().pathname);
  const lead = workspace.role === "founder" || workspace.role === "sales";
  const logos = useLogos();
  const templates = useTemplates();

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
        ["production", "Production"],
        ["review", "Review"],
        ["results", "Results"],
        ["library", "Library"],
        ["money", "Money"],
        ...videos,
        ["whiteboard", "Whiteboard"],
        ["shared", "Shared"],
        ["onboarding", "Onboarding"],
        ["logins", "Logins"],
      ]
    : [
        ["concepts", "Ideas"],
        ["scripts", "Scripts"],
        ["review", "Review"],
        ["results", "Results"],
        ["library", "Library"],
        ...videos,
        ["whiteboard", "Whiteboard"],
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
      <div className="client-actions">
        <ClientNudge clientId={clientId} />
        {lead && (
          <a
            className="btn btn-secondary"
            href={previewPath(clientId)}
            target="_blank"
            rel="noopener"
            title="Opens the portal exactly as this client sees it, read-only, in a new tab"
          >
            View as client
          </a>
        )}
      </div>
      <nav className="portal-tabs" aria-label={client.brand}>
        {tabs.map(([path, label]) => (
          <NavLink
            key={path}
            to={`/clients/${clientId}${path ? `/${path}` : ""}`}
            end={!["whiteboard", "review", "money", "results"].includes(path ?? "")}
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
                  <LookPanel clientId={clientId} brand={client.brand} />
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
            <Route path="production" element={<TeamProduction clientId={clientId} />} />
            {["money", "money/:invoiceId"].map((path) => (
              <Route key={path} path={path} element={<TeamMoney clientId={clientId} />} />
            ))}
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
        {["review", "review/:cutId"].map((path) => (
          <Route key={path} path={path} element={<TeamReview clientId={clientId} />} />
        ))}
        {["results", "results/:postId"].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <ResultsScreen
                target={target}
                base={`/clients/${clientId}/results`}
                template={templates.data?.[clientId] === "cinematic" ? "cinematic" : "performance"}
              />
            }
          />
        ))}
        <Route path="library" element={<LibraryScreen target={target} />} />
        {["whiteboard", "whiteboard/:boardId"].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <WhiteboardRoute
                target={target}
                base={`/clients/${clientId}/whiteboard`}
                reader="team"
                template={templates.data?.[clientId] === "cinematic" ? "cinematic" : "performance"}
              />
            }
          />
        ))}
        {/* The old green-mat board stays readable at …/board until its notes are moved over. */}
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
