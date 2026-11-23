// The studio calendar (Heni, 23 Nov 2026): a month at a time, every shoot, first-draft date, milestone, invoice
// due and lead follow-up on one grid. Click a day to see it, click an entry to open it. Everyone sees shoots;
// the founder and producers also see money and leads.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { useLeads } from "@/features/pipeline/leadsApi";
import { useTeamShoots } from "@/features/shoot/shootApi";
import { useToday } from "@/features/today/todayApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";

interface Entry {
  kind: "shoot" | "drafts" | "milestone" | "invoice" | "lead";
  brand: string;
  label: string;
  to: string;
}

const KIND: Record<Entry["kind"], string> = {
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
    shoot: true,
    drafts: true,
    milestone: true,
    invoice: true,
    lead: true,
  });
  const shoots = useTeamShoots(workspaceId);
  const today = useToday();
  const leads = useLeads();

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
  }, [shoots.data, today.data, leads.data, lead]);

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
          <p className="eyebrow">Calendar</p>
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
          .filter(({ k }) => lead || k === "shoot")
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
            <p className="empty-state">Nothing on this day.</p>
          ) : (
            <ul className="cal-list">
              {pickedEntries.map((e, i) => (
                <li key={i}>
                  <Link to={e.to} className={`cal-item kind-${e.kind}`}>
                    <span className="small">{KIND[e.kind]}</span>
                    <strong dir="auto">{e.brand}</strong>
                    <span className="small" dir="auto">
                      {e.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
