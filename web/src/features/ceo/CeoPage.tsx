// The CEO cockpit (Heni, 23 Nov 2026: "tools for the CEO"). Founder only.
// The month's goal and how far along it is, money in and owed, the weighted pipeline, each client's health with
// the reasons, the pipeline as a funnel, and a weekly report ready for WhatsApp.
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { toast } from "@/components/Toast";
import { useAlerts } from "@/features/alerts/alertsApi";
import { useClients } from "@/features/clients/clientsApi";
import { whatsappLink } from "@/features/clients/messages";
import { normaliseTeam } from "@/features/invoices/model";
import { useLeads } from "@/features/pipeline/leadsApi";
import { STAGE_LABEL, STEPS, stepOf } from "@/features/pipeline/model";
import { normaliseProjects } from "@/features/projects/projectsApi";
import { useTeamShoots } from "@/features/shoot/shootApi";
import { useToday } from "@/features/today/todayApi";
import { byClient, daysSince } from "@/features/today/model";
import { CountUp } from "@/features/today/HomeMore";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import {
  addMoney,
  clientHealth,
  forecast,
  moneyFor,
  NO_MONEY,
  weeklyReport,
  type MoneyInvoice,
} from "./model";

const dt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} DT`;

interface Goal {
  revenue: number | null;
  deals: number | null;
  reels: number | null;
  note: string;
}

function useGoal(workspaceId: string, month: string) {
  return useQuery({
    queryKey: ["studio-goal", workspaceId, month],
    queryFn: async (): Promise<Goal | null> => {
      const { data, error } = await requireSupabase()
        .from("studio_goals")
        .select("revenue,deals,reels,note")
        .eq("workspace_id", workspaceId)
        .eq("month", `${month}-01`)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const d = data as {
        revenue: number | string | null;
        deals: number | null;
        reels: number | null;
        note: string;
      };
      return {
        revenue: d.revenue == null ? null : Number(d.revenue),
        deals: d.deals,
        reels: d.reels,
        note: d.note,
      };
    },
  });
}

/** A ring that fills to the share reached, the number in the middle. */
function Ring({
  value,
  of,
  label,
  money,
}: {
  value: number;
  of: number | null;
  label: string;
  money?: boolean;
}) {
  const share = of && of > 0 ? Math.min(1, value / of) : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="ceo-ring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
        />
      </svg>
      <div className="ceo-ring-text">
        <strong>
          <CountUp value={money ? dt(value) : String(value)} />
        </strong>
        <span className="small">
          {of ? `of ${money ? dt(of) : of} · ${Math.round(share * 100)}%` : "no goal yet"}
        </span>
        <span className="eyebrow">{label}</span>
      </div>
    </div>
  );
}

export function CeoPage() {
  const { id: workspaceId, role } = useWorkspace();
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const clients = useClients();
  const leads = useLeads();
  const today = useToday();
  const shoots = useTeamShoots(workspaceId);
  const alerts = useAlerts(30);
  const goal = useGoal(workspaceId, month);
  const [editing, setEditing] = useState(false);
  const [lang, setLang] = useState<"en" | "fr">("fr");
  const list = clients.data ?? [];

  const invoiceQs = useQueries({
    queries: list.map((c) => ({
      queryKey: ["invoices", workspaceId, c.id],
      queryFn: async () => {
        const { data, error } = await requireSupabase().rpc("get_invoices", {
          p_workspace_id: workspaceId,
          p_client_id: c.id,
        });
        if (error) throw error;
        return normaliseTeam(data);
      },
    })),
  });
  const projectQs = useQueries({
    queries: list.map((c) => ({
      queryKey: ["projects", workspaceId, c.id],
      queryFn: async () => {
        const { data, error } = await requireSupabase().rpc("get_projects", {
          p_workspace_id: workspaceId,
          p_client_id: c.id,
        });
        if (error) throw error;
        return normaliseProjects(data);
      },
    })),
  });

  const perClient = list.map((c, i) => {
    const invoices = (invoiceQs[i]?.data?.invoices ?? []) as unknown as MoneyInvoice[];
    const money = moneyFor(invoices, month);
    const projects = (projectQs[i]?.data?.projects ?? []).filter((p) => p.status === "active");
    const scripts = projects.reduce((s, p) => s + p.scripts, 0);
    const approved = projects.reduce((s, p) => s + p.approved, 0);
    const reels = projects.reduce((s, p) => s + p.reels, 0);
    const nextShoot =
      (shoots.data ?? [])
        .filter((s) => s.clientId === c.id && s.day >= now.toISOString().slice(0, 10))
        .map((s) => s.day)
        .sort()[0] ?? null;
    const waiting = byClient(today.data?.client ?? []).find((g) => g.client_id === c.id);
    const last = (alerts.data?.activity ?? []).find((a) => a.client_id === c.id);
    const health = clientHealth({
      waitingDays: waiting ? daysSince(waiting.oldest) : 0,
      overdue: money.overdue,
      scripts,
      approved,
      nextShoot,
      quietDays: last ? daysSince(last.at) : null,
    });
    return { client: c, money, scripts, approved, reels, nextShoot, health };
  });

  const money = perClient.reduce((m, x) => addMoney(m, x.money), NO_MONEY);
  const f = forecast(leads.data ?? [], month);
  const reelsInWork = perClient.reduce((s, x) => s + x.reels, 0);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const newLeads = (leads.data ?? []).filter((l) => Date.parse(l.created_at) > weekAgo).length;
  const approvals = (alerts.data?.activity ?? []).filter(
    (a) => a.kind === "approve" && Date.parse(a.at) > weekAgo,
  ).length;
  const upcoming = (shoots.data ?? []).filter(
    (s) => s.day >= now.toISOString().slice(0, 10),
  ).length;
  const report = weeklyReport({
    lang,
    cashIn: money.cashIn,
    owed: money.owed,
    wonCount: f.wonCount,
    wonValue: f.wonValue,
    newLeads,
    approvals,
    shoots: upcoming,
    goal: goal.data?.revenue ?? null,
  });

  const funnel = useMemo(() => {
    const open = (leads.data ?? []).filter((l) => !["won", "lost", "nurture"].includes(l.stage));
    return STEPS.map((step) => {
      const here = open.filter((l) => stepOf(l.stage) === step);
      return {
        step,
        count: here.length,
        value: here.reduce((s, l) => s + (l.value ?? 0), 0),
      };
    });
  }, [leads.data]);
  const widest = Math.max(1, ...funnel.map((x) => x.count));

  if (role !== "founder")
    return (
      <section className="page">
        <Notice>The cockpit is for the founder.</Notice>
      </section>
    );

  return (
    <section className="page wide ceo">
      <header className="page-head ceo-head">
        <div>
          <h1>{monthName}</h1>
          <p className="lede">
            {goal.data?.note || "Where the studio stands this month, and what to push."}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setEditing(!editing)}>
          {editing ? "Close" : goal.data ? "Change the goals" : "Set this month's goals"}
        </Button>
      </header>

      {editing && (
        <GoalForm
          workspaceId={workspaceId}
          month={month}
          goal={goal.data ?? null}
          onDone={() => setEditing(false)}
        />
      )}

      <div className="ceo-rings">
        <Ring value={money.cashIn} of={goal.data?.revenue ?? null} label="Cash in" money />
        <Ring value={f.wonCount} of={goal.data?.deals ?? null} label="Deals signed" />
        <Ring value={reelsInWork} of={goal.data?.reels ?? null} label="Reels in work" />
      </div>

      <div className="ceo-tiles">
        <Tile label="Still owed" value={dt(money.owed)} hint="Sent, not paid" />
        <Tile
          label="Overdue"
          value={dt(money.overdue)}
          hint={money.overdue > 0 ? "Chase today" : "Nothing late"}
          tone={money.overdue > 0 ? "alert" : "plain"}
        />
        <Tile label="Drafts to send" value={dt(money.drafts)} hint="Written, not sent" />
        <Tile
          label="Pipeline, weighted"
          value={dt(f.weighted)}
          hint={`${dt(f.open)} open in ${f.openCount} leads`}
          tone="good"
        />
        <Tile label="Won this month" value={dt(f.wonValue)} hint={`${f.wonCount} deals`} />
        <Tile
          label="New leads, 7 days"
          value={String(newLeads)}
          hint={`${approvals} client approvals`}
        />
      </div>

      <div className="today-cols">
        <section className="today-section">
          <div className="today-section-head">
            <h2>Client health</h2>
            <span className="small">100 is great; each problem takes points off</span>
          </div>
          {perClient.length === 0 ? (
            <p className="empty-state">No clients yet.</p>
          ) : (
            <ul className="ceo-health">
              {perClient
                .slice()
                .sort((a, b) => a.health.score - b.health.score)
                .map((x) => (
                  <li key={x.client.id}>
                    <Link
                      to={`/clients/${encodeURIComponent(x.client.id)}`}
                      className="ceo-health-row"
                    >
                      <span className={`ceo-score tone-${x.health.tone}`}>{x.health.score}</span>
                      <span className="ceo-health-who">
                        <strong dir="auto">{x.client.brand}</strong>
                        <span className="small">
                          {x.health.reasons.length ? x.health.reasons.join(" · ") : "All good"}
                        </span>
                      </span>
                      <span className="small ceo-health-money">
                        {x.money.owed > 0 ? `owes ${dt(x.money.owed)}` : "nothing owed"}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="today-section">
          <div className="today-section-head">
            <h2>Pipeline</h2>
            <Link className="small" to="/pipeline">
              Open →
            </Link>
          </div>
          <ol className="ceo-funnel">
            {funnel.map((x) => (
              <li key={x.step}>
                <span className="small">{STAGE_LABEL[x.step]}</span>
                <span className="ceo-funnel-bar">
                  <span style={{ width: `${Math.max(4, (x.count / widest) * 100)}%` }}>
                    {x.count}
                  </span>
                </span>
                <span className="small">{x.value ? dt(x.value) : ""}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="today-section ceo-report">
        <div className="today-section-head">
          <h2>Weekly report</h2>
          <div className="seg" role="group" aria-label="Language">
            {(["fr", "en"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l === "fr" ? "Français" : "English"}
              </button>
            ))}
          </div>
        </div>
        <pre className="ceo-report-text">{report}</pre>
        <div className="actions">
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(report)
                .then(() => toast({ text: "Report copied" }))
                .catch(() => toast({ text: "Couldn't copy", tone: "error" }))
            }
          >
            Copy
          </Button>
          <a
            className="btn btn-primary"
            href={whatsappLink(report)}
            target="_blank"
            rel="noreferrer noopener"
          >
            Send on WhatsApp
          </a>
        </div>
      </section>
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "plain" | "alert" | "good";
}) {
  return (
    <div className={`pulse-tile pulse-${tone}`}>
      <span className="pulse-label">{label}</span>
      <strong className="pulse-value">
        <CountUp value={value} />
      </strong>
      <span className="pulse-hint">{hint}</span>
    </div>
  );
}

function GoalForm({
  workspaceId,
  month,
  goal,
  onDone,
}: {
  workspaceId: string;
  month: string;
  goal: Goal | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: async (g: Goal) => {
      const { error } = await requireSupabase()
        .from("studio_goals")
        .upsert({ workspace_id: workspaceId, month: `${month}-01`, ...g });
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["studio-goal", workspaceId, month] }),
  });
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const n = (k: string) => {
      const v = String(form.get(k) ?? "").trim();
      return v === "" ? null : Math.max(0, Number(v) || 0);
    };
    try {
      await save.mutateAsync({
        revenue: n("revenue"),
        deals: n("deals"),
        reels: n("reels"),
        note: String(form.get("note") ?? "")
          .trim()
          .slice(0, 500),
      });
      toast({ text: "Goals set", detail: "The rings fill as the month goes.", celebrate: true });
      onDone();
    } catch (err) {
      setError(friendlyError(err));
    }
  }
  return (
    <form className="card ceo-goal-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Cash to bring in (DT)</span>
        <input name="revenue" type="number" min={0} step="1" defaultValue={goal?.revenue ?? ""} />
      </label>
      <label className="field">
        <span>Deals to sign</span>
        <input name="deals" type="number" min={0} defaultValue={goal?.deals ?? ""} />
      </label>
      <label className="field">
        <span>Reels to make</span>
        <input name="reels" type="number" min={0} defaultValue={goal?.reels ?? ""} />
      </label>
      <label className="field ceo-goal-note">
        <span>The month in one line</span>
        <input
          name="note"
          maxLength={500}
          defaultValue={goal?.note ?? ""}
          placeholder="Close two retainers, ship Dany's launch."
        />
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button type="submit" disabled={save.isPending}>
          Save goals
        </Button>
      </div>
    </form>
  );
}
