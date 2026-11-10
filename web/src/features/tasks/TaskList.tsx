import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { todayIso } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { canEdit, dueLabel, dueTone, sortTasks, whoFor, type Task, type TaskInput } from "./model";

/**
 * A shared to-do list: tick, add, remove. The same list for the team and the client; the team can also
 * keep a task private, and sees which client each task is for on its own list.
 */
export function TaskList({
  tasks,
  reader,
  canWrite,
  onAdd,
  onTick,
  onRemove,
  showBrand = false,
  linkFor,
  empty,
  limit,
}: {
  tasks: readonly Task[];
  reader: "client" | "team";
  canWrite: boolean;
  onAdd?: (task: TaskInput) => Promise<unknown>;
  onTick: (task: Task, done: boolean) => Promise<unknown>;
  onRemove?: (task: Task) => Promise<unknown>;
  showBrand?: boolean;
  /** Where a task's link goes, for lists that live outside the client's pages. */
  linkFor?: (task: Task) => string;
  empty?: string;
  /** Show only this many open tasks, with a "show all" link. */
  limit?: number;
}) {
  const today = todayIso();
  const [error, setError] = useState("");
  const [all, setAll] = useState(false);
  const sorted = sortTasks(tasks);
  const open = sorted.filter((x) => !x.doneAt);
  const done = sorted.filter((x) => x.doneAt);
  const shown = limit && !all ? open.slice(0, limit) : open;

  const run = (p: Promise<unknown>) =>
    p.then(
      () => setError(""),
      (e: unknown) => setError(friendlyError(e)),
    );

  return (
    <div className="tasks">
      {canWrite && onAdd && <AddTask reader={reader} onAdd={onAdd} />}
      {error && <Notice tone="error">{error}</Notice>}
      {open.length === 0 && (
        <p className="empty-state">
          {empty ?? t("Nothing to do. Nice.", "Rien à faire. Parfait.")}
        </p>
      )}
      <ul className="task-list">
        {shown.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            reader={reader}
            today={today}
            canWrite={canWrite}
            showBrand={showBrand}
            link={linkFor ? linkFor(task) : task.link}
            onTick={(d) => run(onTick(task, d))}
            onRemove={onRemove && canEdit(task, reader) ? () => run(onRemove(task)) : undefined}
          />
        ))}
      </ul>
      {limit && open.length > limit && (
        <Button variant="link" onClick={() => setAll((v) => !v)}>
          {all
            ? t("Show fewer", "Afficher moins")
            : t(`Show all ${open.length}`, `Tout afficher (${open.length})`)}
        </Button>
      )}
      {done.length > 0 && (
        <details className="task-done">
          <summary>
            {t(`Done lately (${done.length})`, `Faites récemment (${done.length})`)}
          </summary>
          <ul className="task-list">
            {done.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                reader={reader}
                today={today}
                canWrite={canWrite}
                showBrand={showBrand}
                link={linkFor ? linkFor(task) : task.link}
                onTick={(d) => run(onTick(task, d))}
              />
            ))}
          </ul>
        </details>
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
  onRemove,
}: {
  task: Task;
  reader: "client" | "team";
  today: string;
  canWrite: boolean;
  showBrand: boolean;
  link: string;
  onTick: (done: boolean) => void;
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
        {onRemove && (
          <button type="button" className="line-comment" onClick={onRemove}>
            {t("Remove", "Retirer")}
          </button>
        )}
      </span>
    </li>
  );
}

function AddTask({
  reader,
  onAdd,
}: {
  reader: "client" | "team";
  onAdd: (task: TaskInput) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("title")) return setError(t("Write the task first.", "Écrivez d'abord la tâche."));
    setBusy(true);
    setError("");
    try {
      await onAdd({
        title: text("title"),
        side: (text("side") || (reader === "client" ? "client" : "gecko")) as TaskInput["side"],
        assignee: text("assignee"),
        due: text("due") || null,
        private: form.get("private") === "on",
      });
      formEl.reset();
      setMore(false);
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
          aria-label={t("New task", "Nouvelle tâche")}
          placeholder={t("Add a task…", "Ajouter une tâche…")}
          onFocus={() => setMore(true)}
        />
        <Button type="submit" disabled={busy}>
          {t("Add", "Ajouter")}
        </Button>
      </div>
      {more && (
        <div className="task-add-more">
          <label>
            <span className="small">{t("For", "Pour")}</span>
            <select name="side" defaultValue={reader === "client" ? "client" : "gecko"}>
              <option value="gecko">Gecko</option>
              <option value="client">{reader === "client" ? t("Us", "Nous") : "The client"}</option>
            </select>
          </label>
          <label>
            <span className="small">{t("Who", "Qui")}</span>
            <input name="assignee" maxLength={120} placeholder={t("A name", "Un prénom")} />
          </label>
          <label>
            <span className="small">{t("Due", "Pour le")}</span>
            <input type="date" name="due" />
          </label>
          {reader === "team" && (
            <label className="task-private-pick">
              <input type="checkbox" name="private" /> <span className="small">Team only</span>
            </label>
          )}
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
