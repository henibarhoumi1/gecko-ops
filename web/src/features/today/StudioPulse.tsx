import { Link } from "react-router-dom";
import { useClients } from "@/features/clients/clientsApi";
import { useLeads } from "@/features/pipeline/leadsApi";
import { useTeamShoots } from "@/features/shoot/shootApi";
import { useTeamTasks } from "@/features/tasks/tasksApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { pulse } from "./pulse";

/** The founder's view of the studio, on top of Home: money in the pipeline, wins, follow-ups, clients, tasks. */
export function StudioPulse({ today }: { today: string }) {
  const { id: workspaceId } = useWorkspace();
  const leads = useLeads();
  const clients = useClients();
  const shoots = useTeamShoots(workspaceId);
  const tasks = useTeamTasks(workspaceId);
  const tiles = pulse({
    today,
    leads: leads.data ?? [],
    activeClients: (clients.data ?? []).length,
    shoots: shoots.data ?? [],
    tasks: tasks.data ?? [],
  });
  const loading = leads.isPending || clients.isPending;
  return (
    <section className="pulse" aria-label="The studio at a glance">
      {tiles.map((tile) => (
        <Link key={tile.key} to={tile.to} className={`pulse-tile pulse-${tile.tone}`}>
          <span className="pulse-label">{tile.label}</span>
          <strong className="pulse-value">{loading ? "…" : tile.value}</strong>
          <span className="pulse-hint">{tile.hint}</span>
        </Link>
      ))}
    </section>
  );
}
