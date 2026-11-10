import { Link } from "react-router-dom";
import { Notice } from "@/components/Notice";
import type { ClientPortal } from "@/features/auth/account";
import { useClientRole } from "@/features/portal/role";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { previewRole } from "@/lib/preview";
import { openFor } from "./model";
import { TaskList } from "./TaskList";
import { useTaskActions, useTasks, useTeamTasks } from "./tasksApi";

/** One client's tasks, on the client page. */
export function TeamTasks({ clientId }: { clientId: string }) {
  const { id: workspaceId } = useWorkspace();
  const tasks = useTasks({ workspaceId, clientId }, "team");
  const act = useTaskActions(workspaceId);
  if (tasks.isPending) return <p className="muted">Loading tasks…</p>;
  if (tasks.isError) return <Notice tone="error">{friendlyError(tasks.error)}</Notice>;
  return (
    <section className="tab-body">
      <p className="lede">
        One list with the client: what Gecko does, what the client does. They see everything here
        except tasks marked Team only.
      </p>
      <TaskList
        tasks={tasks.data ?? []}
        reader="team"
        canWrite
        onAdd={(task) => act.save.mutateAsync({ clientId, task })}
        onEdit={(task, input) =>
          act.save.mutateAsync({ clientId, task: { ...input, id: task.id } })
        }
        onTick={(task, done) => act.tick.mutateAsync({ clientId, id: task.id, done })}
        onRemove={(task) => act.remove.mutateAsync({ clientId, id: task.id })}
        linkFor={(task) => (task.link ? `/clients/${clientId}${task.link}` : "")}
      />
    </section>
  );
}

/** Every open task the team has, across clients, on Today. */
export function TodayTasks() {
  const { id: workspaceId } = useWorkspace();
  const tasks = useTeamTasks(workspaceId);
  const act = useTaskActions(workspaceId);
  if (tasks.isPending || tasks.isError) return null;
  const all = tasks.data ?? [];
  const ours = all.filter((x) => x.side === "gecko");
  const theirs = openFor(all, "client");
  return (
    <section className="today-section">
      <h2>
        Tasks <span className="today-count">{openFor(all, "team").length}</span>
      </h2>
      <TaskList
        tasks={ours}
        reader="team"
        canWrite
        showBrand
        limit={8}
        empty="Nothing on Gecko's list."
        onAdd={(task) => act.save.mutateAsync({ clientId: null, task: { ...task, side: "gecko" } })}
        onEdit={(task, input) =>
          act.save.mutateAsync({ clientId: task.clientId, task: { ...input, id: task.id } })
        }
        onTick={(task, done) =>
          act.tick.mutateAsync({ clientId: task.clientId, id: task.id, done })
        }
        onRemove={(task) => act.remove.mutateAsync({ clientId: task.clientId, id: task.id })}
        linkFor={(task) =>
          task.clientId
            ? `/clients/${encodeURIComponent(task.clientId)}${task.link || "/tasks"}`
            : ""
        }
      />
      {theirs.length > 0 && (
        <p className="small">
          Waiting on clients: {theirs.length} ·{" "}
          {[...new Set(theirs.map((x) => x.brand).filter(Boolean))].join(", ")}
        </p>
      )}
    </section>
  );
}

const canWriteAs = (role: string) => !previewRole() && role !== "viewer";

/** The client's tasks page in the portal. */
export function PortalTasks({ portal }: { portal: ClientPortal }) {
  const role = useClientRole();
  const tasks = useTasks(portal, "client");
  const act = useTaskActions(portal.workspaceId);
  const clientId = portal.clientId;
  if (tasks.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (tasks.isError) return <Notice tone="error">{friendlyError(tasks.error)}</Notice>;
  return (
    <section className="tab-body">
      <p className="lede">
        {t(
          "One list with Gecko: what we do, what you do. Add anything, tick it when it's done.",
          "Une seule liste avec Gecko : ce qu'on fait, ce que vous faites. Ajoutez ce que vous voulez, cochez quand c'est fait.",
        )}
      </p>
      <TaskList
        tasks={tasks.data ?? []}
        reader="client"
        canWrite={canWriteAs(role)}
        onAdd={(task) => act.save.mutateAsync({ clientId, task })}
        onEdit={(task, input) =>
          act.save.mutateAsync({ clientId, task: { ...input, id: task.id } })
        }
        onTick={(task, done) => act.tick.mutateAsync({ clientId, id: task.id, done })}
        onRemove={(task) => act.remove.mutateAsync({ clientId, id: task.id })}
      />
    </section>
  );
}

/** On the client's home: what's waiting on them, when anything is. */
export function HomeTasks({ portal }: { portal: { workspaceId: string; clientId: string } }) {
  const role = useClientRole();
  const tasks = useTasks(portal, "client");
  const act = useTaskActions(portal.workspaceId);
  const mine = tasks.data ? openFor(tasks.data, "client") : [];
  if (mine.length === 0) return null;
  return (
    <section className="home-tasks">
      <h2>
        {t("Your to-dos", "Vos tâches")} <span className="today-count">{mine.length}</span>
      </h2>
      <TaskList
        tasks={mine}
        reader="client"
        canWrite={canWriteAs(role)}
        limit={4}
        filters={false}
        onTick={(task, done) =>
          act.tick.mutateAsync({ clientId: portal.clientId, id: task.id, done })
        }
      />
      <p className="small">
        <Link to="/tasks">{t("All tasks", "Toutes les tâches")} →</Link>
      </p>
    </section>
  );
}
