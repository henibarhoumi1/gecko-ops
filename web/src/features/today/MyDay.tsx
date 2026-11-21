import { Link } from "react-router-dom";
import { useTeamShoots } from "@/features/shoot/shootApi";
import { TodayTasks } from "@/features/tasks/TaskPanels";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { greeting } from "./pulse";
import { shortDay, when } from "./model";

const isoToday = () => new Date().toISOString().slice(0, 10);

/** Home for editors and assistants: the team's tasks and the shoots coming up on the clients they're on. */
export function MyDay() {
  const { id: workspaceId } = useWorkspace();
  const shoots = useTeamShoots(workspaceId);
  const today = isoToday();
  const coming = (shoots.data ?? [])
    .filter((s) => s.day >= today)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, 6);
  return (
    <section className="page wide today today-v1">
      <header className="page-head">
        <div>
          <p className="eyebrow">{shortDay(today)}</p>
          <h1>{greeting(new Date().getHours())}.</h1>
          <p className="today-sum">Your tasks and the shoots coming up.</p>
        </div>
      </header>

      <div className="today-cols">
        <TodayTasks />
        <section className="today-section">
          <h2>
            Coming up <span className="today-count">{coming.length}</span>
          </h2>
          {shoots.isPending ? (
            <p className="small">Loading…</p>
          ) : coming.length === 0 ? (
            <p className="empty-state">No shoot day planned on your clients.</p>
          ) : (
            <ul className="today-lines">
              {coming.map((s) => (
                <li key={s.id} className="today-line">
                  <Link to={`/shoots/${encodeURIComponent(s.clientId)}/${s.id}`}>
                    <strong>{s.brand}</strong>
                    {s.title && ` · ${s.title}`}
                  </Link>
                  <span className="small">
                    {when(s.day, today)}
                    {s.callTime && ` · call ${s.callTime}`}
                    {s.place && ` · ${s.place}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
