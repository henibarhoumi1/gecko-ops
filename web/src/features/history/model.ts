import { t } from "@/lib/i18n";

/** One thing that happened on a client (get_client_history). */
export interface HistoryEvent {
  at: string;
  who: string;
  /** Who did it: the client (true), Gecko (false), or unknown (an approval names the person). */
  client: boolean | null;
  kind:
    | "idea_added"
    | "idea_approved"
    | "script_added"
    | "script_approved"
    | "cut_approved"
    | "cut_delivered"
    | "post_live"
    | "task_done"
    | "read_published"
    | "removed";
  title: string;
  /** Where it lives, as a page path: /scripts#script-… */
  link: string;
}

export function verb(kind: HistoryEvent["kind"]): string {
  switch (kind) {
    case "idea_added":
      return t("added the idea", "a ajouté l'idée");
    case "idea_approved":
      return t("approved the idea", "a validé l'idée");
    case "script_added":
      return t("wrote the script", "a écrit le script");
    case "script_approved":
      return t("approved the script", "a validé le script");
    case "cut_approved":
      return t("approved the edit", "a validé le montage");
    case "cut_delivered":
      return t("delivered the final file of", "a livré le fichier final de");
    case "post_live":
      return t("put online", "a mis en ligne");
    case "task_done":
      return t("ticked off", "a coché");
    case "read_published":
      return t("published the monthly read for", "a publié le bilan du mois");
    case "removed":
      return t("removed", "a retiré");
  }
}

/** Events grouped by day, newest day first, in the reader's time zone. */
export function byDay(events: readonly HistoryEvent[]): { day: string; events: HistoryEvent[] }[] {
  const out: { day: string; events: HistoryEvent[] }[] = [];
  for (const e of [...events].sort((a, b) => b.at.localeCompare(a.at))) {
    const d = new Date(e.at);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const last = out[out.length - 1];
    if (last && last.day === day) last.events.push(e);
    else out.push({ day, events: [e] });
  }
  return out;
}

/** Who did it, as the reader says it. */
export function whoDid(e: Pick<HistoryEvent, "who" | "client">, reader: "client" | "team"): string {
  const name = e.who.trim() || (e.client ? t("The client", "Le client") : "Gecko");
  if (e.client === false && reader === "client" && name !== "Gecko") return `${name} (Gecko)`;
  return name;
}

/** Only the kinds the reader picked; empty means all. */
export const filterKinds = (
  events: readonly HistoryEvent[],
  kinds: readonly HistoryEvent["kind"][],
) => (kinds.length === 0 ? [...events] : events.filter((e) => kinds.includes(e.kind)));
