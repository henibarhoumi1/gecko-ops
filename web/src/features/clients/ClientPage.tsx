import { useMemo } from "react";
import { Link, NavLink, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Notice } from "@/components/Notice";
import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { useClients } from "./clientsApi";
import { LoginsPanel } from "./LoginsPanel";
import { OverviewEditor } from "./OverviewEditor";
import { TeamConcepts } from "./TeamConcepts";

/** One client's portal, from the team's side. */
export function ClientPage() {
  const { clientId = "" } = useParams();
  const workspace = useWorkspace();
  const clients = useClients();
  const target = useMemo(() => ({ workspaceId: workspace.id, clientId }), [workspace.id, clientId]);
  const lead = workspace.role === "founder" || workspace.role === "sales";

  if (clients.isPending) return <p className="loading">Loading…</p>;
  if (clients.isError) return <Notice tone="error">{friendlyError(clients.error)}</Notice>;
  const client = clients.data.find((c) => c.id === clientId);
  if (!client) return <Navigate to="/clients" replace />;

  const tabs = lead
    ? [
        ["", "Overview"],
        ["concepts", "Concepts"],
        ["onboarding", "Onboarding"],
        ["logins", "Client logins"],
      ]
    : [["concepts", "Concepts"]];

  return (
    <section className="page">
      <p className="small">
        <Link to="/clients">← Clients</Link>
      </p>
      <h1>{client.brand}</h1>
      <nav className="portal-tabs" aria-label={client.brand}>
        {tabs.map(([path, label]) => (
          <NavLink
            key={path}
            to={`/clients/${clientId}${path ? `/${path}` : ""}`}
            end
            className="portal-tab"
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        {lead ? (
          <>
            <Route index element={<OverviewEditor clientId={clientId} />} />
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
        <Route path="*" element={<Navigate to={`/clients/${clientId}`} replace />} />
      </Routes>
    </section>
  );
}
