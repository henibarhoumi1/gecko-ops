// Finance (Heni, 24 Nov 2026): every invoice of every client on one page, what came in month by month, what is
// owed and late, what Gecko advanced and hasn't billed yet, and a CSV for the accountant. Founder only.
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useClients } from "@/features/clients/clientsApi";
import { CountUp } from "@/features/today/HomeMore";
import { normaliseTeam, type Invoice } from "@/features/invoices/model";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { requireSupabase } from "@/lib/supabase";

const dt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} DT`;
const num = (v: number | string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

type Filter = "all" | "draft" | "sent" | "overdue" | "paid";

interface Row extends Invoice {
  clientId: string;
  brand: string;
}

/** The last n months as "2026-11", oldest first. */
export function lastMonths(n: number, from = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export function toCsv(rows: readonly Row[]): string {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = [
    "Number",
    "Client",
    "Title",
    "Status",
    "Issued",
    "Due",
    "Paid on",
    "Subtotal",
    "Tax",
    "Total",
  ];
  const lines = rows.map((r) =>
    [
      r.number ?? "",
      r.brand,
      r.title,
      r.overdue && r.status === "sent" ? "overdue" : r.status,
      r.issueDate,
      r.dueDate,
      r.paidOn ?? "",
      String(num(r.subtotal)),
      String(num(r.taxTotal)),
      String(num(r.total)),
    ]
      .map(esc)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function FinancePage() {
  const { id: workspaceId, role } = useWorkspace();
  const clients = useClients();
  const list = clients.data ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const qs = useQueries({
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
  const loading = clients.isPending || qs.some((q) => q.isPending);

  const rows: Row[] = list
    .flatMap((c, i) =>
      (qs[i]?.data?.invoices ?? [])
        .filter((v) => v.status !== "void")
        .map((v) => ({ ...v, clientId: c.id, brand: c.brand })),
    )
    .sort((a, b) => (b.issueDate || b.createdAt).localeCompare(a.issueDate || a.createdAt));
  const unbilled = list.reduce(
    (s, _c, i) => s + (qs[i]?.data?.openCosts ?? []).reduce((t, o) => t + num(o.cost), 0),
    0,
  );

  const month = new Date().toISOString().slice(0, 7);
  const months = lastMonths(6);
  const paidBy = months.map((m) => ({
    m,
    total: rows
      .filter((r) => r.status === "paid" && r.paidOn?.startsWith(m))
      .reduce((s, r) => s + num(r.total), 0),
  }));
  const top = Math.max(1, ...paidBy.map((x) => x.total));
  const sum = (f: (r: Row) => boolean) => rows.filter(f).reduce((s, r) => s + num(r.total), 0);
  const cashIn = sum((r) => r.status === "paid" && !!r.paidOn?.startsWith(month));
  const owed = sum((r) => r.status === "sent");
  const overdue = sum((r) => r.status === "sent" && r.overdue);
  const drafts = sum((r) => r.status === "draft");
  const year = sum((r) => r.status === "paid" && !!r.paidOn?.startsWith(month.slice(0, 4)));

  const shown = rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "overdue"
        ? r.status === "sent" && r.overdue
        : r.status === filter,
  );

  if (role !== "founder")
    return (
      <section className="page">
        <Notice>Finance is for the founder.</Notice>
      </section>
    );

  function download() {
    const blob = new Blob([toCsv(shown)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gecko-invoices-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="page wide finance">
      <header className="page-head ceo-head">
        <div>
          <h1>Finance</h1>
          <p className="lede">Every invoice, every client, in one place.</p>
        </div>
        <Button variant="secondary" onClick={download} disabled={rows.length === 0}>
          Export CSV
        </Button>
      </header>

      <div className="ceo-tiles">
        {(
          [
            ["Cash in this month", cashIn, ""],
            ["Still owed", owed, ""],
            ["Overdue", overdue, overdue > 0 ? "alert" : ""],
            ["Drafts to send", drafts, ""],
            ["Advanced, not billed", unbilled, unbilled > 0 ? "alert" : ""],
            [`Paid in ${month.slice(0, 4)}`, year, "good"],
          ] as const
        ).map(([label, value, tone]) => (
          <div key={label} className={`pulse-tile ${tone ? `pulse-${tone}` : ""}`}>
            <span className="pulse-label">{label}</span>
            <strong className="pulse-value">
              {loading ? <span className="skeleton-line" /> : <CountUp value={dt(value)} />}
            </strong>
          </div>
        ))}
      </div>

      <section className="today-section">
        <h2>Cash in, last 6 months</h2>
        <div className="fin-bars" role="img" aria-label="Cash in per month">
          {paidBy.map((x) => (
            <div key={x.m} className={`fin-bar${x.m === month ? " is-now" : ""}`}>
              <span className="small">{x.total ? dt(x.total) : ""}</span>
              <span className="fin-bar-col">
                <span style={{ height: `${Math.max(2, (x.total / top) * 100)}%` }} />
              </span>
              <span className="small">
                {new Date(`${x.m}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short" })}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="today-section">
        <div className="today-section-head">
          <h2>
            Invoices <span className="today-count">{shown.length}</span>
          </h2>
          <div className="seg" role="group" aria-label="Show">
            {(["all", "draft", "sent", "overdue", "paid"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "sent" ? "Sent" : f[0]!.toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <p className="loading">Loading</p>
        ) : shown.length === 0 ? (
          <p className="empty-state">No invoices here.</p>
        ) : (
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>What</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const st = r.status === "sent" && r.overdue ? "overdue" : r.status;
                  return (
                    <tr key={r.id}>
                      <td>{r.number ?? "Draft"}</td>
                      <td>
                        <Link to={`/clients/${encodeURIComponent(r.clientId)}/money`} dir="auto">
                          {r.brand}
                        </Link>
                      </td>
                      <td dir="auto">{r.title}</td>
                      <td>
                        <span className={`fin-status st-${st}`}>{st}</span>
                      </td>
                      <td>{r.status === "paid" ? `paid ${r.paidOn ?? ""}` : r.dueDate}</td>
                      <td className="num">{dt(num(r.total))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
