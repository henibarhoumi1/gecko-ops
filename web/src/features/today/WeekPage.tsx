// The weekly team review (Heni, 24 Nov 2026), made by itself from the app: what happened in the last 7 days and
// what's coming in the next 7, ready to read in the Monday meeting or send to the team on WhatsApp.
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { describeAction, useAlerts } from "@/features/alerts/alertsApi";
import { whatsappLink } from "@/features/clients/messages";
import { useLeads } from "@/features/pipeline/leadsApi";
import { useTeamShoots } from "@/features/shoot/shootApi";
import { useTeamTasks } from "@/features/tasks/tasksApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { useToday } from "./todayApi";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) =>
  new Date(`${s.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function WeekPage() {
  const { id: workspaceId } = useWorkspace();
  const alerts = useAlerts(7);
  const leads = useLeads();
  const shoots = useTeamShoots(workspaceId);
  const tasks = useTeamTasks(workspaceId);
  const today = useToday();
  const now = new Date();
  const t0 = iso(now);
  const weekAgo = iso(new Date(now.getTime() - 7 * 86_400_000));
  const weekOn = iso(new Date(now.getTime() + 7 * 86_400_000));

  const acts = alerts.data?.activity ?? [];
  const approved = acts.filter((a) => a.kind === "approve");
  const changes = acts.filter((a) => a.kind !== "approve");
  const newLeads = (leads.data ?? []).filter((l) => l.created_at.slice(0, 10) >= weekAgo);
  const won = (leads.data ?? []).filter((l) =>
    l.history.some(
      (h) => ["won", "signed", "accepted"].includes(h.stage) && h.at.slice(0, 10) >= weekAgo,
    ),
  );
  const shot = (shoots.data ?? []).filter((s) => s.day >= weekAgo && s.day < t0);
  const comingShoots = (shoots.data ?? []).filter((s) => s.day >= t0 && s.day <= weekOn);
  const dueTasks = (tasks.data ?? []).filter((x) => !x.doneAt && x.due && x.due <= weekOn);
  const lateTasks = dueTasks.filter((x) => x.due! < t0);
  const dates = (today.data?.dates ?? []).filter(
    (d) => d.date >= t0 && d.date <= weekOn && d.kind !== "lead" && d.kind !== "shoot",
  );
  const followUps = (leads.data ?? []).filter(
    (l) => l.next_date && l.next_date <= weekOn && !["won", "lost", "nurture"].includes(l.stage),
  );

  const text = [
    `Gecko · week of ${day(t0)}`,
    "",
    "Last 7 days",
    `• ${approved.length} client approvals, ${changes.length} change requests or comments`,
    `• ${newLeads.length} new leads, ${won.length} won`,
    `• ${shot.length} shoot days done`,
    "",
    "Next 7 days",
    ...comingShoots.map(
      (s) => `• Shoot ${day(s.day)}: ${s.brand}${s.callTime ? `, call ${s.callTime}` : ""}`,
    ),
    ...dates.map((d) => `• ${day(d.date)}: ${d.brand}, ${d.label}`),
    `• ${dueTasks.length} tasks due (${lateTasks.length} late), ${followUps.length} leads to follow up`,
  ].join("\n");

  return (
    <section className="page wide week">
      <header className="page-head ceo-head">
        <div>
          <h1>This week</h1>
          <p className="lede">
            Made from the app: the last 7 days and the next 7, for the Monday meeting.
          </p>
        </div>
        <div className="actions">
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(text)
                .then(() => toast({ text: "Copied for the team" }))
            }
          >
            Copy
          </Button>
          <a
            className="btn btn-primary"
            href={whatsappLink(text)}
            target="_blank"
            rel="noreferrer noopener"
          >
            Send to the team
          </a>
        </div>
      </header>

      <div className="week-cols">
        <section className="today-section">
          <h2>Last 7 days</h2>
          <div className="week-stats">
            <p>
              <strong>{approved.length}</strong> client approvals
            </p>
            <p>
              <strong>{changes.length}</strong> changes and comments
            </p>
            <p>
              <strong>{newLeads.length}</strong> new leads
            </p>
            <p>
              <strong>{won.length}</strong> won
            </p>
            <p>
              <strong>{shot.length}</strong> shoot days
            </p>
          </div>
          {acts.length > 0 && (
            <ul className="week-list">
              {acts.slice(0, 10).map((a, i) => (
                <li key={i}>
                  <Link to={`/clients/${encodeURIComponent(a.client_id)}`}>
                    <strong>{a.author || "Client"}</strong> {describeAction(a)}{" "}
                    <span dir="auto">{a.title}</span>
                  </Link>
                  <span className="small">
                    {a.brand} · {day(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="today-section">
          <h2>Next 7 days</h2>
          {comingShoots.length + dates.length + dueTasks.length + followUps.length === 0 ? (
            <p className="empty-state">A quiet week ahead.</p>
          ) : (
            <ul className="week-list">
              {comingShoots.map((s) => (
                <li key={s.id}>
                  <Link to={`/shoots/${encodeURIComponent(s.clientId)}/${s.id}`}>
                    <strong>Shoot</strong> {s.brand}
                    {s.callTime ? `, call ${s.callTime}` : ""}
                  </Link>
                  <span className="small">{day(s.day)}</span>
                </li>
              ))}
              {dates.map((d, i) => (
                <li key={`d${i}`}>
                  <span>
                    <strong>{d.brand}</strong> {d.label}
                  </span>
                  <span className="small">{day(d.date)}</span>
                </li>
              ))}
              {dueTasks.slice(0, 12).map((x) => (
                <li key={x.id} className={x.due! < t0 ? "is-late" : ""}>
                  <span>
                    <strong>Task</strong> {x.title}
                    {x.assignee ? ` · ${x.assignee}` : ""}
                  </span>
                  <span className="small">{x.due! < t0 ? "late" : day(x.due!)}</span>
                </li>
              ))}
              {followUps.length > 0 && (
                <li>
                  <Link to="/pipeline?view=outreach">
                    <strong>{followUps.length} leads</strong> to follow up
                  </Link>
                  <span className="small">Pipeline</span>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
