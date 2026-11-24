// More on Home (Heni, 23 Nov 2026: "home needs some real work, right now it's just dates and a lead list").
// Every client's campaign at a glance, what clients just did, who on the team has what, and (founder) money.
// All from data the app already reads; nothing new is stored.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { describeAction, useAlerts } from "@/features/alerts/alertsApi";
import { useClients } from "@/features/clients/clientsApi";
import { useInvoices } from "@/features/invoices/invoicesApi";
import { useProjects } from "@/features/projects/projectsApi";
import { useTeamTasks } from "@/features/tasks/tasksApi";
import { useMembers } from "@/features/workspace/members";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { daysSince, waited } from "./model";

const day = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} DT`;

function Bar({ done, of, label }: { done: number; of: number; label: string }) {
  const pct = of > 0 ? Math.min(100, Math.round((done / of) * 100)) : 0;
  return (
    <div className="home-bar" title={`${label}: ${done} of ${of}`}>
      <span className="small">
        {label} <strong>{of > 0 ? `${done}/${of}` : "none yet"}</strong>
      </span>
      <span className="home-bar-track" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

/** One row per client: the current campaign's progress, the next shoot and (founder) what they owe. */
export function CampaignBoard({ founder }: { founder: boolean }) {
  const clients = useClients();
  const list = clients.data ?? [];
  if (clients.isPending || list.length === 0) return null;
  return (
    <section className="today-section home-campaigns">
      <div className="today-section-head">
        <h2>
          Campaigns <span className="today-count">{list.length}</span>
        </h2>
        <Link className="small" to="/clients">
          All clients →
        </Link>
      </div>
      <ul className="home-campaign-list">
        {list.map((c) => (
          <CampaignRow key={c.id} clientId={c.id} brand={c.brand} founder={founder} />
        ))}
      </ul>
    </section>
  );
}

function CampaignRow({
  clientId,
  brand,
  founder,
}: {
  clientId: string;
  brand: string;
  founder: boolean;
}) {
  const { id: workspaceId } = useWorkspace();
  const target = useMemo(() => ({ workspaceId, clientId }), [workspaceId, clientId]);
  const projects = useProjects(target);
  const active = (projects.data?.projects ?? []).filter((p) => p.status === "active");
  const p = active[0];
  return (
    <li>
      <Link className="home-campaign" to={`/clients/${encodeURIComponent(clientId)}`}>
        <span className="home-campaign-name">
          <strong dir="auto">{brand}</strong>
          <span className="small" dir="auto">
            {p ? p.name : "No active campaign"}
            {active.length > 1 ? ` · +${active.length - 1} more` : ""}
          </span>
        </span>
        {p ? (
          <>
            <StageTrack at={stageOf(p, new Date().toISOString().slice(0, 10))} />
            <Bar done={p.approved} of={p.scripts} label="Scripts approved" />
            <span className="home-campaign-facts small">
              <span>
                <strong>{p.ideas}</strong> ideas
              </span>
              <span>
                <strong>{p.reels}</strong> reels
              </span>
              <span>{p.nextShoot ? `Shoot ${day(p.nextShoot)}` : "No shoot planned"}</span>
            </span>
          </>
        ) : (
          <span className="small">Start one from the client&rsquo;s page.</span>
        )}
        {founder && <Owed workspaceId={workspaceId} clientId={clientId} />}
      </Link>
    </li>
  );
}

function Owed({ workspaceId, clientId }: { workspaceId: string; clientId: string }) {
  const target = useMemo(() => ({ workspaceId, clientId }), [workspaceId, clientId]);
  const invoices = useInvoices(target);
  const open = (invoices.data?.invoices ?? []).filter((v) => v.status === "sent");
  if (open.length === 0) return <span className="home-owed small">Nothing owed</span>;
  const total = open.reduce((s, v) => s + Number(v.total || 0), 0);
  const late = open.some((v) => v.overdue);
  return (
    <span className={`home-owed small${late ? " is-late" : ""}`}>
      Owes <strong>{money(total)}</strong>
      {late ? " · late" : ""}
    </span>
  );
}

/** The last things clients approved, asked to change or said, newest first. */
export function ClientActivity() {
  const alerts = useAlerts(14);
  const activity = (alerts.data?.activity ?? []).slice(0, 8);
  return (
    <section className="today-section">
      <div className="today-section-head">
        <h2>What clients did</h2>
        <Link className="small" to="/alerts">
          All →
        </Link>
      </div>
      {alerts.isPending ? (
        <p className="small muted">Loading…</p>
      ) : activity.length === 0 ? (
        <p className="empty-state">No approvals, change requests or comments in two weeks.</p>
      ) : (
        <ul className="home-feed">
          {activity.map((a, i) => (
            <li key={`${a.at}-${i}`} className={`home-feed-item kind-${a.kind}`}>
              <span className="home-feed-dot" aria-hidden="true" />
              <span>
                <strong>{a.author || "Client"}</strong> {describeAction(a)}{" "}
                <Link to={`/clients/${encodeURIComponent(a.client_id)}`} dir="auto">
                  {a.title}
                </Link>
                <span className="small muted">
                  {" "}
                  · {a.brand} · {waited(daysSince(a.at))}
                </span>
                {a.body && (
                  <q className="small" dir="auto">
                    {a.body}
                  </q>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Who on the team has what: open Gecko tasks per person, and how many are late. */
export function TeamLoad({ today }: { today: string }) {
  const { id: workspaceId } = useWorkspace();
  const members = useMembers();
  const tasks = useTeamTasks(workspaceId);
  const open = (tasks.data ?? []).filter((x) => !x.doneAt && x.side === "gecko");
  const people = members.data ?? [];
  if (people.length === 0) return null;
  const rows = [
    ...people.map((m) => {
      const mine = open.filter((x) => x.assignee && (x.assignee === m.id || x.assignee === m.name));
      return { key: m.id, name: m.name, title: m.title || "", tasks: mine };
    }),
    {
      key: "_none",
      name: "Nobody yet",
      title: "Not assigned",
      tasks: open.filter((x) => !x.assignee),
    },
  ].filter((r) => r.key !== "_none" || r.tasks.length > 0);
  return (
    <section className="today-section">
      <div className="today-section-head">
        <h2>
          The team <span className="today-count">{people.length}</span>
        </h2>
        <Link className="small" to="/team">
          Team →
        </Link>
      </div>
      <ul className="home-team">
        {rows.map((r) => {
          const late = r.tasks.filter((x) => x.due && x.due < today).length;
          return (
            <li key={r.key}>
              <span className="home-avatar" aria-hidden="true">
                {r.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="home-team-who">
                <strong>{r.name}</strong>
                {r.title && <span className="small">{r.title}</span>}
              </span>
              <span className="small">
                {r.tasks.length === 0
                  ? "Free"
                  : `${r.tasks.length} open${late ? ` · ${late} late` : ""}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Counts a number up from 0 when it first shows ("36", "1,300 DT"); text without a number shows as is. */
export function CountUp({ value }: { value: string }) {
  const match = /^([^0-9]*)([0-9](?:[0-9 ,.]*[0-9])?)(.*)$/.exec(value);
  const target = match ? Number((match[2] ?? "").replace(/[ ,]/g, "")) : NaN;
  const [shown, setShown] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!Number.isFinite(target) || started.current) return;
    started.current = true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setShown(target);
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 700);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  if (!match || !Number.isFinite(target)) return <>{value}</>;
  return (
    <>
      {match[1]}
      {shown.toLocaleString("fr-FR")}
      {match[3]}
    </>
  );
}

export interface NextItem {
  key: string;
  tone: "us" | "them" | "leads" | "shoot";
  title: string;
  detail: string;
  action: { label: string; to?: string; href?: string };
}

const TONE_LABEL: Record<NextItem["tone"], string> = {
  us: "Your move",
  them: "Nudge",
  leads: "Sales",
  shoot: "Shoot",
};

/** The few things worth doing next, each with the one button that does it. */
export function DoNext({ items }: { items: NextItem[] }) {
  return (
    <section className="do-next" aria-label="Do next">
      <div className="do-next-head">
        <h2>Do next</h2>
        <span className="small">
          {items.length === 0
            ? "You're clear. Nothing is waiting on you."
            : `${items.length} ${items.length === 1 ? "thing" : "things"}, most urgent first`}
        </span>
      </div>
      {items.length > 0 && (
        <ol className="do-next-list">
          {items.slice(0, 6).map((it, i) => (
            <li
              key={it.key}
              className={`do-next-item tone-${it.tone}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="do-next-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="do-next-text">
                <span className="do-next-tag">{TONE_LABEL[it.tone]}</span>
                <strong dir="auto">{it.title}</strong>
                <span className="small" dir="auto">
                  {it.detail}
                </span>
              </span>
              {it.action.href ? (
                <a
                  className="btn btn-primary do-next-go"
                  href={it.action.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {it.action.label}
                </a>
              ) : (
                <Link className="btn btn-primary do-next-go" to={it.action.to ?? "/"}>
                  {it.action.label} →
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const STAGES = ["Ideas", "Scripts", "Shoot", "Edit", "Deliver"] as const;

/** Where a campaign is: ideas, then scripts approved, then the shoot, the edit and delivery. */
export function stageOf(
  p: { ideas: number; scripts: number; approved: number; reels: number; nextShoot: string | null },
  today: string,
): number {
  if (p.reels > 0) return 3;
  if (p.nextShoot && p.nextShoot.slice(0, 10) <= today) return 3;
  if (p.approved > 0) return 2;
  if (p.scripts > 0 || p.ideas > 0) return p.scripts > 0 ? 1 : 0;
  return 0;
}

export function StageTrack({ at }: { at: number }) {
  return (
    <ol className="stage-track" aria-label={`Stage: ${STAGES[at] ?? ""}`}>
      {STAGES.map((name, i) => (
        <li key={name} className={i < at ? "done" : i === at ? "now" : ""}>
          <span className="stage-dot" aria-hidden="true" />
          <span className="stage-name">{name}</span>
        </li>
      ))}
    </ol>
  );
}
