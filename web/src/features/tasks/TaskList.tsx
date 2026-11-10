import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { todayIso } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import {
  canEdit,
  dueLabel,
  dueTone,
  filterTasks,
  sortTasks,
  taskPages,
  whoFor,
  type Task,
  type TaskFilter,
  type TaskInput,
} from "./model";

/**
 * A shared to-do list: add, tick, edit, remove, filter. The same list for the team and the client; the
 * team can also keep a task private, and sees which client each task is for on its own list.
 */
export function TaskList({
  tasks,
  reader,
  canWrite,
  onAdd,
  onEdit,
  onTick,
  onRemove,
  showBrand = false,
  linkFor,
  empty,
  limit,
  filters = true,
}: {
  tasks: readonly Task[];
  reader: "client" | "team";
  canWrite: boolean;
  onAdd?: (task: TaskInput) => Promise<unknown>;
  onEdit?: (task: Task, input: TaskInput) => Promise<unknown>;
  onTick: (task: Task, done: boolean) => Promise<unknown>;
  onRemove?: (task: Task) => Promise<unknown>;
  showBrand?: boolean;
  /** Where a task's link goes, for lists that live outside the client's pages. */
  linkFor?: (task: Task) => string;
  empty?: string;
  /** Show only this many, with a "show all" link. */
  limit?: number;
  /** The filter chips above the list (off for the short list on Home). */
  filters?: boolean;
}) {
  const today = todayIso();
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [editing, setEditing] = useState<string | null>(null);
  const shown = sortTasks(filterTasks(tasks, filter, reader, today));
  const visible = limit && !all ? shown.slice(0, limit) : shown;

  const run = (p: Promise<unknown>) =>
    p.then(
      () => setError(""),
      (e: unknown) => setError(friendlyError(e)),
    );

  const counts: Record<TaskFilter, number> = {
    open: filterTasks(tasks, "open", reader, today).length,
    mine: filterTasks(tasks, "mine", reader, today).length,
    late: filterTasks(tasks, "late", reader, today).length,
    done: filterTasks(tasks, "done", reader, today).length,
  };
  const chips: [TaskFilter, string][] = [
    ["open", t("To do", "À faire")],
    ["mine", reader === "client" ? t("For us", "Pour nous") : "For Gecko"],
    ["late", t("Late", "En retard")],
    ["done", t("Done", "Faites")],
  ];

  return (
    <div className="tasks">
      {canWrite && onAdd && <TaskForm reader={reader} onSave={onAdd} />}
      {filters && tasks.length > 0 && (
        <div className="task-filters" role="toolbar" aria-label={t("Show", "Afficher")}>
          {chips.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`room-chip${filter === key ? " on" : ""}${key === "late" && counts.late ? " late" : ""}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label} <strong>{counts[key]}</strong>
            </button>
          ))}
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {shown.length === 0 && (
        <p className="empty-state">
          {filter === "open"
            ? (empty ?? t("Nothing to do. Nice.", "Rien à faire. Parfait."))
            : t("Nothing here.", "Rien ici.")}
        </p>
      )}
      <ul className="task-list">
        {visible.map((task) =>
          editing === task.id && onEdit ? (
            <li key={task.id} className="task task-editing">
              <TaskForm
                reader={reader}
                task={task}
                onSave={(input) => onEdit(task, input).then(() => setEditing(null))}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <TaskRow
              key={task.id}
              task={task}
              reader={reader}
              today={today}
              canWrite={canWrite}
              showBrand={showBrand}
              link={linkFor ? linkFor(task) : task.link}
              onTick={(d) => run(onTick(task, d))}
              onEdit={
                onEdit && canWrite && canEdit(task, reader) && !task.doneAt
                  ? () => setEditing(task.id)
                  : undefined
              }
              onRemove={
                onRemove && canWrite && canEdit(task, reader)
                  ? () => run(onRemove(task))
                  : undefined
              }
            />
          ),
        )}
      </ul>
      {limit && shown.length > limit && (
        <Button variant="link" onClick={() => setAll((v) => !v)}>
          {all
            ? t("Show fewer", "Afficher moins")
            : t(`Show all ${shown.length}`, `Tout afficher (${shown.length})`)}
        </Button>
      )}
    </div>
  );
}

function TaskRow({
  task,
  reader,
  today,
  canWrite,
  showBrand,
  link,
  onTick,
  onEdit,
  onRemove,
}: {
  task: Task;
  reader: "client" | "team";
  today: string;
  canWrite: boolean;
  showBrand: boolean;
  link: string;
  onTick: (done: boolean) => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const tone = dueTone(task, today);
  const mineToDo = !task.doneAt && task.side === (reader === "client" ? "client" : "gecko");
  return (
    <li className={`task${task.doneAt ? " done" : ""}${mineToDo ? " mine" : ""}`}>
      <label className="task-tick">
        <input
          type="checkbox"
          checked={Boolean(task.doneAt)}
          disabled={!canWrite}
          onChange={(e) => onTick(e.target.checked)}
        />
        <span className="task-title" dir="auto">
          {task.title}
        </span>
      </label>
      {task.notes && !task.doneAt && (
        <p className="task-notes small" dir="auto">
          {task.notes}
        </p>
      )}
      <span className="task-meta small">
        {showBrand && (task.brand ? <strong>{task.brand}</strong> : <strong>Gecko</strong>)}
        <span className={`task-who side-${task.side}`}>{whoFor(task, reader)}</span>
        {task.due && !task.doneAt && (
          <span className={`task-due due-${tone}`}>{dueLabel(task.due, today)}</span>
        )}
        {task.doneAt && task.doneBy && (
          <span className="muted">{t(`Done by ${task.doneBy}`, `Fait par ${task.doneBy}`)}</span>
        )}
        {task.private && <span className="task-private">Team only</span>}
        {link && (
          <Link to={link} className="task-link">
            {t("Open", "Ouvrir")} →
          </Link>
        )}
        {onEdit && (
          <button type="button" className="line-comment" onClick={onEdit}>
            {t("Edit", "Modifier")}
          </button>
        )}
        {onRemove && (
          <button type="button" className="line-comment" onClick={onRemove}>
            {t("Remove", "Retirer")}
          </button>
        )}
      </span>
    </li>
  );
}

/** Adds a task, or changes one: what, for whom, by when, about which page, and notes. */
function TaskForm({
  reader,
  task,
  onSave,
  onCancel,
}: {
  reader: "client" | "team";
  task?: Task;
  onSave: (task: TaskInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [more, setMore] = useState(Boolean(task));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("title")) return setError(t("Write the task first.", "Écrivez d'abord la tâche."));
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...(task ? { id: task.id } : {}),
        title: text("title"),
        side: (text("side") || (reader === "client" ? "client" : "gecko")) as TaskInput["side"],
        assignee: text("assignee"),
        due: text("due") || null,
        private: form.get("private") === "on",
        link: text("link"),
        notes: text("notes"),
      });
      if (!task) {
        formEl.reset();
        setMore(false);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="task-add" onSubmit={onSubmit}>
      <div className="task-add-row">
        <input
          name="title"
          dir="auto"
          maxLength={200}
          defaultValue={task?.title}
          aria-label={task ? t("The task", "La tâche") : t("New task", "Nouvelle tâche")}
          placeholder={t("Add a task…", "Ajouter une tâche…")}
          onFocus={() => setMore(true)}
          autoFocus={Boolean(task)}
        />
        <Button type="submit" disabled={busy}>
          {task ? t("Save", "Enregistrer") : t("Add", "Ajouter")}
        </Button>
        {onCancel && (
          <Button variant="link" onClick={onCancel}>
            {t("Cancel", "Annuler")}
          </Button>
        )}
      </div>
      {more && (
        <>
          <div className="task-add-more">
            <label>
              <span className="small">{t("For", "Pour")}</span>
              <select
                name="side"
                defaultValue={task?.side ?? (reader === "client" ? "client" : "gecko")}
              >
                <option value="gecko">Gecko</option>
                <option value="client">
                  {reader === "client" ? t("Us", "Nous") : "The client"}
                </option>
              </select>
            </label>
            <label>
              <span className="small">{t("Who", "Qui")}</span>
              <input
                name="assignee"
                maxLength={120}
                defaultValue={task?.assignee}
                placeholder={t("A name", "Un prénom")}
              />
            </label>
            <label>
              <span className="small">{t("Due", "Pour le")}</span>
              <input type="date" name="due" defaultValue={task?.due ?? ""} />
            </label>
            <label>
              <span className="small">{t("About", "Concerne")}</span>
              <select name="link" defaultValue={task?.link ?? ""}>
                {taskPages().map(([path, label]) => (
                  <option key={path} value={path}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {reader === "team" && (
              <label className="task-private-pick">
                <input type="checkbox" name="private" defaultChecked={task?.private} />{" "}
                <span className="small">Team only</span>
              </label>
            )}
          </div>
          <textarea
            name="notes"
            className="task-notes-input"
            dir="auto"
            rows={2}
            maxLength={2000}
            defaultValue={task?.notes}
            placeholder={t(
              "Notes, links, details (optional)",
              "Notes, liens, détails (facultatif)",
            )}
          />
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
