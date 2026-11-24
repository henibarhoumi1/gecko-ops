// The studio calendar (Heni, 23 Nov 2026): a month at a time, every shoot, first-draft date, milestone, invoice
// due and lead follow-up on one grid. Click a day to see it, click an entry to open it. Everyone sees shoots;
// the founder and producers also see money and leads.
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { useLeads } from "@/features/pipeline/leadsApi";
import { useTaskActions, useTeamTasks } from "@/features/tasks/tasksApi";
import { friendlyError } from "@/lib/errors";
import { googleCalendarLink, useEventActions, useStudioEvents } from "./calendarApi";
import { useTeamShoots } from "@/features/shoot/shootApi";
import { useToday } from "@/features/today/todayApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

interface Entry {
  kind:
    | "shoot"
    | "drafts"
    | "milestone"
    | "invoice"
    | "lead"
    | "task"
    | "meeting"
    | "event"
    | "note";
  brand: string;
  label: string;
  to: string;
  /** Studio events: removable, and a Google Calendar / Meet link. */
  eventId?: string;
  time?: string;
  external?: string;
}

const KIND: Record<Entry["kind"], string> = {
  meeting: "Meeting",
  event: "Event",
  note: "Note",
  task: "Task",
  shoot: "Shoot",
  drafts: "Drafts due",
  milestone: "Milestone",
  invoice: "Invoice due",
  lead: "Follow-up",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The 6 weeks shown for a month, Monday first. */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - offset));
  return Array.from({ length: 42 }, (_, i) => iso(new Date(start.getTime() + i * 86_400_000)));
}

export function CalendarPage() {
  const { id: workspaceId, role } = useWorkspace();
  const lead = role === "founder" || role === "sales";
  const now = new Date();
  const todayIso = iso(now);
  const [cursor, setCursor] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() });
  const [picked, setPicked] = useState<string>(todayIso);
  const [show, setShow] = useState<Record<Entry["kind"], boolean>>({
    meeting: true,
    event: true,
    note: true,
    task: true,
    shoot: true,
    drafts: true,
    milestone: true,
    invoice: true,
    lead: true,
  });
  const shoots = useTeamShoots(workspaceId);
  const today = useToday();
  const leads = useLeads();
  const tasks = useTeamTasks(workspaceId);
  const events = useStudioEvents();
  const clients = useClients();

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    const add = (day: string, e: Entry) => map.set(day, [...(map.get(day) ?? []), e]);
    for (const s of shoots.data ?? [])
      add(s.day, {
        kind: "shoot",
        brand: s.brand,
        label: [s.title || "Shoot", s.callTime && `call ${s.callTime}`].filter(Boolean).join(" · "),
        to: `/shoots/${encodeURIComponent(s.clientId)}/${s.id}`,
      });
    for (const e of events.data ?? [])
      add(e.day, {
        kind: e.kind,
        brand: e.title,
        label: [e.time, e.notes].filter(Boolean).join(" · "),
        to: e.clientId ? `/clients/${encodeURIComponent(e.clientId)}` : "/calendar",
        eventId: e.id,
        time: e.time,
        external: e.link || googleCalendarLink(e),
      });
    for (const t of tasks.data ?? [])
      if (t.due && !t.doneAt)
        add(t.due, {
          kind: "task",
          brand: t.title,
          label: t.assignee ? `for ${t.assignee}` : t.side === "client" ? "client's task" : "Gecko",
          to: t.clientId ? `/clients/${encodeURIComponent(t.clientId)}/tasks` : "/today",
        });
    if (lead) {
      for (const d of today.data?.dates ?? []) {
        if (d.kind === "shoot" || d.kind === "lead") continue;
        add(d.date, {
          kind: d.kind,
          brand: d.brand,
          label: d.label,
          to: d.client_id ? `/clients/${encodeURIComponent(d.client_id)}` : "/pipeline",
        });
      }
      for (const l of leads.data ?? [])
        if (l.next_date && !["won", "lost", "nurture"].includes(l.stage))
          add(l.next_date, {
            kind: "lead",
            brand: l.brand,
            label: l.next_step || "Follow up",
            to: `/pipeline?lead=${encodeURIComponent(l.id)}`,
          });
    }
    return map;
  }, [shoots.data, today.data, leads.data, lead, tasks.data, events.data]);

  const days = monthGrid(cursor.y, cursor.m);
  const monthKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`;
  const title = new Date(Date.UTC(cursor.y, cursor.m, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(Date.UTC(c.y, c.m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  const visible = (day: string) => (byDay.get(day) ?? []).filter((e) => show[e.kind]);
  const pickedEntries = visible(picked);
  const eventActions = useEventActions();
  const counts = (Object.keys(KIND) as Entry["kind"][]).map((k) => ({
    k,
    n: [...byDay.entries()]
      .filter(([d]) => d.startsWith(monthKey))
      .reduce((s, [, es]) => s + es.filter((e) => e.kind === k).length, 0),
  }));

  return (
    <section className="page wide calendar">
      <header className="page-head cal-head">
        <div>
          <h1>{title}</h1>
        </div>
        <div className="cal-nav">
          <Button variant="secondary" onClick={() => move(-1)} aria-label="Previous month">
            ←
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setCursor({ y: now.getUTCFullYear(), m: now.getUTCMonth() });
              setPicked(todayIso);
            }}
          >
            Today
          </Button>
          <Button variant="secondary" onClick={() => move(1)} aria-label="Next month">
            →
          </Button>
        </div>
      </header>

      <div className="cal-filters" role="group" aria-label="Show">
        {counts
          .filter(({ k }) => lead || !["invoice", "lead", "drafts", "milestone"].includes(k))
          .map(({ k, n }) => (
            <button
              key={k}
              type="button"
              className={`cal-filter kind-${k}`}
              aria-pressed={show[k]}
              onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
            >
              <span className="cal-dot" aria-hidden="true" />
              {KIND[k]} <span className="count">{n}</span>
            </button>
          ))}
      </div>

      <div className="cal-layout">
        <div className="cal-grid" role="grid" aria-label={title}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className="cal-weekday" role="columnheader">
              {d}
            </span>
          ))}
          {days.map((day) => {
            const entries = visible(day);
            const out = !day.startsWith(monthKey);
            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                className={`cal-day${out ? " out" : ""}${day === todayIso ? " is-today" : ""}${day === picked ? " is-picked" : ""}`}
                onClick={() => setPicked(day)}
                aria-label={`${day}, ${entries.length} entries`}
              >
                <span className="cal-num">{Number(day.slice(8))}</span>
                <span className="cal-entries">
                  {entries.slice(0, 3).map((e, i) => (
                    <span key={i} className={`cal-chip kind-${e.kind}`} dir="auto">
                      {e.brand}
                    </span>
                  ))}
                  {entries.length > 3 && <span className="cal-more">+{entries.length - 3}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <aside className="cal-side today-section">
          <h2>
            {new Date(`${picked}T12:00:00Z`).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}
          </h2>
          {pickedEntries.length === 0 ? (
            <p className="empty-state">Nothing on this day yet.</p>
          ) : (
            <ul className="cal-list">
              {pickedEntries.map((e, i) => (
                <li key={i}>
                  <Link to={e.to} className={`cal-item kind-${e.kind}`}>
                    <span className="small">
                      {KIND[e.kind]}
                      {e.time ? ` · ${e.time}` : ""}
                    </span>
                    <strong dir="auto">{e.brand}</strong>
                    {e.label && (
                      <span className="small" dir="auto">
                        {e.label}
                      </span>
                    )}
                  </Link>
                  {e.eventId && (
                    <span className="cal-item-tools">
                      {e.kind === "meeting" && (
                        <a
                          href="https://meet.google.com/new"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Start Meet
                        </a>
                      )}
                      {e.external && (
                        <a href={e.external} target="_blank" rel="noreferrer noopener">
                          {e.external.includes("calendar.google")
                            ? "Add to Google Calendar"
                            : "Open link"}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          eventActions.remove
                            .mutateAsync(e.eventId!)
                            .then(() => toast({ text: "Removed from the calendar" }))
                            .catch((err: unknown) =>
                              toast({ text: friendlyError(err), tone: "error" }),
                            )
                        }
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <AddToDay
            day={picked}
            clients={(clients.data ?? []).map((c) => ({ id: c.id, brand: c.brand }))}
          />
        </aside>
      </div>
    </section>
  );
}

type AddKind = "meeting" | "task" | "event" | "note" | "shoot" | "project";

const ADD_KINDS: [AddKind, string][] = [
  ["meeting", "Meeting"],
  ["task", "Task"],
  ["event", "Event"],
  ["note", "Note"],
  ["shoot", "Shoot day"],
  ["project", "Project"],
];

/** Add anything to the picked day: a meeting, task, event or note here; a shoot or project on the client. */
function AddToDay({ day, clients }: { day: string; clients: { id: string; brand: string }[] }) {
  const { id: workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const events = useEventActions();
  const tasks = useTaskActions(workspaceId);
  const [kind, setKind] = useState<AddKind>("meeting");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    const title = String(form.get("title") ?? "").trim();
    const time = String(form.get("time") ?? "").trim();
    const clientId = String(form.get("client") ?? "") || null;
    if (kind === "shoot" || kind === "project") {
      if (!clientId) return toast({ text: "Pick the client first", tone: "error" });
      navigate(
        `/clients/${encodeURIComponent(clientId)}/${kind === "shoot" ? `shoot?day=${day}` : ""}`,
      );
      return;
    }
    if (!title) return toast({ text: "Give it a title", tone: "error" });
    setBusy(true);
    try {
      if (kind === "task")
        await tasks.save.mutateAsync({
          clientId,
          task: { title, side: "gecko", assignee: "", due: day },
        });
      else
        await events.add.mutateAsync({
          day,
          time,
          kind,
          title,
          notes: String(form.get("notes") ?? "").trim(),
          link: "",
          clientId,
        });
      toast({ text: `${ADD_KINDS.find(([k]) => k === kind)?.[1]} added`, detail: title });
      el.reset();
    } catch (err) {
      toast({ text: friendlyError(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="cal-add" onSubmit={onSubmit}>
      <div className="cal-add-kinds" role="group" aria-label="What to add">
        {ADD_KINDS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
      </div>
      {kind !== "shoot" && kind !== "project" && (
        <input
          name="title"
          placeholder={kind === "meeting" ? "Call with Dany Clean" : "What is it?"}
          maxLength={160}
        />
      )}
      <div className="cal-add-row">
        {(kind === "meeting" || kind === "event") && (
          <input name="time" type="time" aria-label="Time" />
        )}
        <select name="client" aria-label="Client" defaultValue="">
          <option value="">
            {kind === "shoot" || kind === "project" ? "Which client?" : "No client"}
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.brand}
            </option>
          ))}
        </select>
      </div>
      {(kind === "meeting" || kind === "event" || kind === "note") && (
        <input name="notes" placeholder="Notes (optional)" maxLength={2000} />
      )}
      <Button type="submit" disabled={busy}>
        {kind === "shoot"
          ? "Plan the shoot day →"
          : kind === "project"
            ? "Open the client →"
            : "Add"}
      </Button>
    </form>
  );
}
