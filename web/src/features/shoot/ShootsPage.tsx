import { useMemo } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { Notice } from "@/components/Notice";
import { useClients } from "@/features/clients/clientsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { todayIso } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { dayLabel, relativeDay, splitDays, stateName } from "./model";
import { ShootScreen } from "./ShootScreen";
import { useTeamShoots } from "./shootApi";

/** The team's shoots across every client they can open; each opens the shared Shoot Day page. */
export function ShootsPage() {
  return (
    <Routes>
      <Route index element={<AllShoots />} />
      <Route path=":clientId/:dayId?" element={<ClientShoot />} />
    </Routes>
  );
}

function AllShoots() {
  const { id: workspaceId } = useWorkspace();
  const shoots = useTeamShoots(workspaceId);
  const today = todayIso();
  if (shoots.isPending) return <p className="loading">Loading the shoots…</p>;
  if (shoots.isError) return <Notice tone="error">{friendlyError(shoots.error)}</Notice>;
  const { upcoming, past } = splitDays(shoots.data, today);

  return (
    <section className="page wide shoot">
      <header className="page-head">
        <div>
          <h1>Shoots</h1>
          <p>
            Every shoot day coming up, for the clients you work on. Open one on set: the reels in
            order, the lines to read, and what&rsquo;s already shot.
          </p>
        </div>
      </header>
      {upcoming.length === 0 && (
        <p className="empty-state">
          No shoot coming up. Shoot days are added from a client&rsquo;s Shoot days tab.
        </p>
      )}
      <ul className="shoot-days">
        {[...upcoming, ...past].map((s) => (
          <li key={s.id}>
            <Link
              className={`shoot-day-card state-${s.state}${s.day < today ? " past" : ""}`}
              to={`/shoots/${encodeURIComponent(s.clientId)}/${s.id}`}
            >
              <span className="shoot-day-when">
                <strong>{dayLabel(s.day)}</strong>
                <span className="small">{relativeDay(s.day, today)}</span>
              </span>
              <span className="shoot-day-what">
                <strong>{s.brand}</strong>
                <span className="small">
                  {[s.title, s.callTime && `Call ${s.callTime}`, s.place]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="shoot-day-count small">
                {s.reels ? `${s.done} of ${s.reels} shot` : "No reels yet"}
                {s.state !== "planned" && <span className="tag">{stateName(s.state)}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ClientShoot() {
  const { clientId = "" } = useParams();
  const { id: workspaceId } = useWorkspace();
  const clients = useClients();
  const target = useMemo(() => ({ workspaceId, clientId }), [workspaceId, clientId]);
  // Editors and production may not see the client list; the brand then comes from the shoots list.
  const shoots = useTeamShoots(workspaceId);
  const brand =
    clients.data?.find((c) => c.id === clientId)?.brand ??
    shoots.data?.find((s) => s.clientId === clientId)?.brand ??
    "";
  return (
    <section className="page wide">
      <p className="small">
        <Link to="/shoots">← Shoots</Link>
      </p>
      <h1>{brand || "Shoot day"}</h1>
      <ShootScreen target={target} base={`/shoots/${encodeURIComponent(clientId)}`} brand={brand} />
    </section>
  );
}
