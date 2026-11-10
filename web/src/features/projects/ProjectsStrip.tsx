import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { useProjects, useSaveProject, type Project, type ProjectTarget } from "./projectsApi";

const STATUS: Record<Project["status"], string> = {
  active: "Active",
  done: "Done",
  archived: "Archived",
};

function day(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * The client's projects, each with its own work. The newest active one is where new ideas, scripts and
 * shoot days go. Founder and producers start, rename and close projects.
 */
export function ProjectsStrip({ target }: { target: ProjectTarget }) {
  const list = useProjects(target);
  const save = useSaveProject(target);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  if (!list.data) return null;
  const { canManage, projects } = list.data;
  const current = projects.find((p) => p.status === "active");
  const archived = projects.filter((p) => p.status === "archived");
  const shown = projects.filter((p) => showArchived || p.status !== "archived");

  return (
    <section className="projects-strip" aria-label="Projects">
      <ul>
        {shown.map((p) =>
          editing === p.id ? (
            <li key={p.id} className="project-card editing">
              <ProjectForm
                initial={p}
                pending={save.isPending}
                onCancel={() => setEditing(null)}
                onSave={(v) =>
                  save.mutate({ ...v, id: p.id }, { onSuccess: () => setEditing(null) })
                }
              />
            </li>
          ) : (
            <li
              key={p.id}
              className={`project-card status-${p.status}${p.id === current?.id ? " current" : ""}`}
            >
              <span className="project-top">
                <strong dir="auto">{p.name}</strong>
                <span className="small">
                  {p.id === current?.id ? "Current · " : ""}
                  {STATUS[p.status]} · {p.kind === "cinematic" ? "Cinematic" : "Performance"}
                </span>
              </span>
              <span className="small">
                {[
                  `${p.ideas} ideas`,
                  `${p.approved}/${p.scripts} scripts approved`,
                  p.nextShoot ? `shoot ${day(p.nextShoot)}` : `${p.shootDays} shoot days`,
                  `${p.reels} reels`,
                ].join(" · ")}
              </span>
              {canManage && (
                <span className="project-actions">
                  <Button variant="link" onClick={() => setEditing(p.id)}>
                    Rename
                  </Button>
                  {p.status !== "done" && (
                    <Button
                      variant="link"
                      onClick={() => save.mutate({ id: p.id, name: p.name, status: "done" })}
                    >
                      Mark done
                    </Button>
                  )}
                  {p.status !== "active" && (
                    <Button
                      variant="link"
                      onClick={() => save.mutate({ id: p.id, name: p.name, status: "active" })}
                    >
                      Reopen
                    </Button>
                  )}
                  {p.status === "done" && (
                    <Button
                      variant="link"
                      onClick={() => save.mutate({ id: p.id, name: p.name, status: "archived" })}
                    >
                      Archive
                    </Button>
                  )}
                </span>
              )}
            </li>
          ),
        )}
        {canManage && (
          <li className="project-card project-new">
            {adding ? (
              <ProjectForm
                initial={null}
                pending={save.isPending}
                onCancel={() => setAdding(false)}
                onSave={(v) => save.mutate(v, { onSuccess: () => setAdding(false) })}
              />
            ) : (
              <Button variant="secondary" onClick={() => setAdding(true)}>
                New project
              </Button>
            )}
          </li>
        )}
      </ul>
      {archived.length > 0 && (
        <Button variant="link" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "Hide archived" : `Show ${archived.length} archived`}
        </Button>
      )}
      {canManage && adding && (
        <p className="small">
          A new project becomes the current one: new ideas, scripts and shoot days go there.
        </p>
      )}
      {save.isError && <Notice tone="error">{friendlyError(save.error)}</Notice>}
    </section>
  );
}

function ProjectForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Project | null;
  pending: boolean;
  onSave: (v: { name: string; kind: Project["kind"] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<Project["kind"]>(initial?.kind ?? "performance");
  return (
    <form
      className="project-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave({ name: name.trim(), kind });
      }}
    >
      <input
        aria-label="Project name"
        placeholder="Ramadan campaign, Brand film…"
        value={name}
        maxLength={120}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <select
        aria-label="Kind of project"
        value={kind}
        onChange={(e) => setKind(e.target.value as Project["kind"])}
      >
        <option value="performance">Performance: ads that sell</option>
        <option value="cinematic">Cinematic: films and image</option>
      </select>
      <span className="project-actions">
        <Button type="submit" disabled={pending || !name.trim()}>
          {initial ? "Save" : "Start the project"}
        </Button>
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </span>
    </form>
  );
}
