import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import {
  AREA_LABEL,
  describeAction,
  useAlerts,
  useMarkErrorsSeen,
  useSiteStats,
} from "./alertsApi";

const PERIODS: [number, string][] = [
  [1, "Last 24 hours"],
  [7, "Last 7 days"],
  [30, "Last 30 days"],
];

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Problems people hit in the app, and what clients approved, asked to change or said. */
export function AlertsPage() {
  const [days, setDays] = useState(7);
  const alerts = useAlerts(days);
  const markSeen = useMarkErrorsSeen();
  const site = useSiteStats(days);
  const totals = site.data?.totals ?? {};
  const siteLeads = site.data?.leads ?? [];
  const errors = alerts.data?.errors ?? [];
  const activity = alerts.data?.activity ?? [];
  const unseen = errors.filter((e) => !e.seen).length;
  const clientProblems = errors.filter((e) => e.from_client && !e.seen).length;

  return (
    <section className="page wide alerts">
      <header className="page-head">
        <div>
          <h1>Alerts</h1>
          <p className="muted">
            {unseen === 0
              ? "No new problems."
              : `${unseen} new ${unseen === 1 ? "problem" : "problems"}${
                  clientProblems ? `, ${clientProblems} hit by a client` : ""
                }.`}{" "}
            {activity.length} client {activity.length === 1 ? "action" : "actions"}.
          </p>
        </div>
        <select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {PERIODS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </header>

      {alerts.error && <Notice tone="error">{friendlyError(alerts.error)}</Notice>}
      {alerts.isLoading && <p className="muted">Loading…</p>}

      <section className="alerts-section">
        <div className="alerts-section-head">
          <h2>Problems</h2>
          {unseen > 0 && (
            <Button
              variant="secondary"
              disabled={markSeen.isPending}
              onClick={() => markSeen.mutate()}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <p className="muted small">
          When a page crashes or something fails for anyone using the app. The client only saw a
          &ldquo;Something went wrong&rdquo; message; nothing they saved was lost.
        </p>
        {errors.length === 0 && !alerts.isLoading ? (
          <p className="empty-state">Nothing went wrong in this period.</p>
        ) : (
          <ul className="alerts-list">
            {errors.map((e) => (
              <li key={e.id} className={e.seen ? "seen" : "new"}>
                <div className="alerts-meta">
                  <strong>{AREA_LABEL[e.area] ?? e.area}</strong>
                  <span className="muted small">
                    {when(e.at)} · {e.from_client ? (e.brand ?? "A client") : "Team"}
                    {e.path && e.path !== "/" ? ` · ${e.path}` : ""}
                  </span>
                </div>
                <code className="alerts-message">{e.message}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="alerts-section">
        <h2>Website</h2>
        <p className="muted small">
          Counted on the public site, with no personal data. Every brief and message sent from the
          site is also saved in the Pipeline.
        </p>
        <dl className="site-stats">
          {(
            [
              ["view", "Page views"],
              ["brief_start", "Briefs started"],
              ["brief_done", "Briefs sent"],
              ["contact_done", "Messages sent"],
              ["wa_click", "WhatsApp taps"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <dt className="muted small">{label}</dt>
              <dd>{(totals[key] ?? 0).toLocaleString("en-GB")}</dd>
            </div>
          ))}
        </dl>
        {siteLeads.length > 0 && (
          <ul className="alerts-list">
            {siteLeads.map((l) => (
              <li key={l.id}>
                <div className="alerts-meta">
                  <span>
                    <strong>{l.brand}</strong> sent {l.form === "brief" ? "a brief" : "a message"}{" "}
                    <Link to="/pipeline">Open the Pipeline</Link>
                  </span>
                  <span className="muted small">{when(l.at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="alerts-section">
        <h2>What clients did</h2>
        {activity.length === 0 && !alerts.isLoading ? (
          <p className="empty-state">
            No client approvals, change requests or comments in this period.
          </p>
        ) : (
          <ul className="alerts-list">
            {activity.map((a, i) => (
              <li key={`${a.at}-${i}`} className={`action action-${a.kind}`}>
                <div className="alerts-meta">
                  <span>
                    <strong>{a.author || "Client"}</strong> ({a.brand}) {describeAction(a)}{" "}
                    <Link to={`/clients/${encodeURIComponent(a.client_id)}`}>{a.title}</Link>
                  </span>
                  <span className="muted small">{when(a.at)}</span>
                </div>
                {a.body && <p className="alerts-body">&ldquo;{a.body}&rdquo;</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
