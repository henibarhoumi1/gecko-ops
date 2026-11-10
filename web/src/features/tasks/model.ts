import { t } from "@/lib/i18n";

/** A to-do both sides share (supabase/migrations/202611280001_tasks_presence.sql). */
export interface Task {
  id: string;
  clientId: string | null;
  /** On the team's list across clients. */
  brand?: string | null;
  projectId: string | null;
  title: string;
  notes: string;
  /** Whose job it is. */
  side: "gecko" | "client";
  assignee: string;
  due: string | null;
  private: boolean;
  /** A page in the app the task is about. */
  link: string;
  doneAt: string | null;
  doneBy: string;
  fromClient: boolean;
  /** Added by the person reading it. */
  mine: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  id?: string;
  title: string;
  side: Task["side"];
  assignee: string;
  due: string | null;
  private?: boolean;
  link?: string;
  notes?: string;
}

/** Days from today to a date, both as YYYY-MM-DD. */
function daysUntil(day: string, today: string): number {
  return Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

export type DueTone = "late" | "today" | "soon" | "later" | "none";

export function dueTone(task: Pick<Task, "due" | "doneAt">, today: string): DueTone {
  if (!task.due || task.doneAt) return "none";
  const n = daysUntil(task.due, today);
  return n < 0 ? "late" : n === 0 ? "today" : n <= 3 ? "soon" : "later";
}

export function dueLabel(due: string | null, today: string): string {
  if (!due) return "";
  const n = daysUntil(due, today);
  if (n === 0) return t("Today", "Aujourd'hui");
  if (n === 1) return t("Tomorrow", "Demain");
  if (n === -1) return t("Yesterday", "Hier");
  if (n < 0) return t(`${-n} days late`, `${-n} jours de retard`);
  if (n < 7) return t(`In ${n} days`, `Dans ${n} jours`);
  return new Date(`${due}T12:00:00Z`).toLocaleDateString(t("en-GB", "fr-FR"), {
    day: "numeric",
    month: "short",
  });
}

/** Open tasks first, late ones on top, then by due date (no date last); done ones at the end, newest first. */
export function sortTasks<T extends Pick<Task, "due" | "doneAt" | "createdAt">>(
  tasks: readonly T[],
): T[] {
  return [...tasks].sort((a, b) => {
    if (!!a.doneAt !== !!b.doneAt) return a.doneAt ? 1 : -1;
    if (a.doneAt && b.doneAt) return b.doneAt.localeCompare(a.doneAt);
    if (a.due !== b.due) return !a.due ? 1 : !b.due ? -1 : a.due.localeCompare(b.due);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Who a task is for, as the reader says it. */
export function whoFor(task: Pick<Task, "side" | "assignee">, reader: "client" | "team"): string {
  const side = task.side === "gecko" ? "Gecko" : reader === "client" ? t("You", "Vous") : "Client";
  return task.assignee ? `${side} · ${task.assignee}` : side;
}

/** The open tasks that wait on this reader's side. */
export const openFor = (tasks: readonly Task[], reader: "client" | "team") =>
  tasks.filter((x) => !x.doneAt && x.side === (reader === "client" ? "client" : "gecko"));

/** The client can change or remove only what they added; the team, everything. */
export const canEdit = (task: Pick<Task, "mine">, reader: "client" | "team") =>
  reader === "team" || task.mine;

export type TaskFilter = "open" | "mine" | "late" | "done";

/** The tasks a filter shows: open ones, the reader's side's, the late ones, or the done ones. */
export function filterTasks<T extends Pick<Task, "doneAt" | "side" | "due">>(
  tasks: readonly T[],
  filter: TaskFilter,
  reader: "client" | "team",
  today: string,
): T[] {
  const mySide = reader === "client" ? "client" : "gecko";
  switch (filter) {
    case "open":
      return tasks.filter((x) => !x.doneAt);
    case "mine":
      return tasks.filter((x) => !x.doneAt && x.side === mySide);
    case "late":
      return tasks.filter((x) => !x.doneAt && x.due !== null && x.due < today);
    case "done":
      return tasks.filter((x) => Boolean(x.doneAt));
  }
}

/** The pages a task can be about, as paths both sides understand (the team adds its client prefix). */
export function taskPages(): [string, string][] {
  return [
    ["", t("Nothing in particular", "Rien de précis")],
    ["/room", t("Writing room", "Atelier d'écriture")],
    ["/concepts", t("Ideas", "Idées")],
    ["/scripts", t("Scripts", "Scripts")],
    ["/shoot", t("Shoot days", "Jours de tournage")],
    ["/brand", t("Brand sheet", "Fiche marque")],
    ["/shared", t("Notes and links", "Notes et liens")],
    ["/review", t("Reels to review", "Vidéos à valider")],
    ["/results", t("Numbers", "Chiffres")],
  ];
}
