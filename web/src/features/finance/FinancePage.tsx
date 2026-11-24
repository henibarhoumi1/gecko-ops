// Finance OS (Heni, 24 Nov 2026): Gecko's money in one place, private to the founder. Overview, what to pay and
// receive, the ledger with every facture, client invoices, a TVA calculator, and who else may look (read-only).
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { normaliseTeam, type Invoice } from "@/features/invoices/model";
import { calculate } from "@/features/pages/blocks";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { blankEntry, EntryPanel } from "./EntryPanel";
import {
  RECEIPT_TYPES,
  useEntries,
  useFinanceAccess,
  useFinanceActions,
  useFinancePeople,
  useFinanceSettings,
  useReceiptUrls,
  type EntryInput,
} from "./financeApi";
import {
  categoryLabel,
  CATEGORIES,
  dayOf,
  dt,
  htOf,
  isOverdue,
  ledgerCsv,
  METHODS,
  summarise,
  VAT_RATES,
  vatCalc,
  vatOf,
  type Entry,
  type Kind,
} from "./model";

const num = (v: number | string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const today = () => new Date().toISOString().slice(0, 10);
const monthName = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short" });
const dayName = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** The last n months as "2026-11", oldest first. */
export function lastMonths(n: number, from = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

interface InvoiceRow extends Invoice {
  clientId: string;
  brand: string;
}

function useAllInvoices(enabled: boolean) {
  const { id: workspaceId } = useWorkspace();
  const clients = useClients();
  const list = enabled ? (clients.data ?? []) : [];
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
  const rows: InvoiceRow[] = list
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
  return { rows, unbilled, loading: clients.isPending || qs.some((q) => q.isPending) };
}

type Tab = "overview" | "todo" | "ledger" | "invoices" | "factures" | "calc" | "access";

export function FinancePage() {
  const access = useFinanceAccess();
  const ok = !!access.data;
  const owner = access.data === "owner";
  const entries = useEntries(ok);
  const settings = useFinanceSettings(ok);
  const invoices = useAllInvoices(ok);
  const [tab, setTab] = useState<Tab>("overview");
  const [panel, setPanel] = useState<{
    entry: Entry | null;
    start: EntryInput;
    files?: File[];
  } | null>(null);
  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const counterparties = useMemo(
    () => [...new Set(list.map((e) => e.counterparty).filter(Boolean))],
    [list],
  );

  if (access.isPending) return <p className="loading">Loading…</p>;
  if (!ok)
    return (
      <section className="page">
        <div className="fin-locked">
          <h1>Finance is private</h1>
          <p>Only the founder sees Gecko&rsquo;s money. Ask Heni if you need to look.</p>
        </div>
      </section>
    );

  const open = (entry: Entry | null, start: EntryInput = blankEntry("out"), files?: File[]) =>
    owner && setPanel({ entry, start, ...(files ? { files } : {}) });
  const tabs: [Tab, string][] = [
    ["overview", "Overview"],
    ["todo", "To do"],
    ["ledger", "Ledger"],
    ["invoices", "Client invoices"],
    ["factures", "Factures"],
    ["calc", "Calculator"],
    ...(owner ? ([["access", "Access"]] as [Tab, string][]) : []),
  ];

  return (
    <section className="page wide finance fos">
      <header className="fos-head">
        <div>
          <h1>Finance</h1>
          <p className="lede">
            {owner
              ? "Gecko’s money: what came in, what went out, what’s next."
              : "Read-only, shared by Heni."}
          </p>
        </div>
        {owner && (
          <div className="fos-acts">
            <button
              type="button"
              className="fos-add is-in"
              onClick={() => open(null, blankEntry("in"))}
            >
              <span aria-hidden="true">+</span> Money in
            </button>
            <button
              type="button"
              className="fos-add is-out"
              onClick={() => open(null, blankEntry("out"))}
            >
              <span aria-hidden="true">−</span> Money out
            </button>
          </div>
        )}
      </header>

      <nav className="fos-tabs" role="tablist" aria-label="Finance">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      {entries.isError && <Notice tone="error">{friendlyError(entries.error)}</Notice>}

      {tab === "overview" && (
        <Overview
          list={list}
          opening={settings.data ?? { amount: 0, on: null }}
          invoices={invoices}
          onOpen={open}
          go={setTab}
        />
      )}
      {tab === "todo" && <ToDo list={list} invoices={invoices.rows} owner={owner} onOpen={open} />}
      {tab === "ledger" && <Ledger list={list} onOpen={open} />}
      {tab === "invoices" && (
        <Invoices invoices={invoices} list={list} owner={owner} onOpen={open} />
      )}
      {tab === "factures" && <Factures list={list} owner={owner} onOpen={open} />}
      {tab === "calc" && <Calculator />}
      {tab === "access" && owner && <Access opening={settings.data ?? { amount: 0, on: null }} />}

      {panel && (
        <EntryPanel
          entry={panel.entry}
          start={panel.start}
          {...(panel.files ? { files: panel.files } : {})}
          counterparties={counterparties}
          onClose={() => setPanel(null)}
        />
      )}
    </section>
  );
}

type Open = (entry: Entry | null, start?: EntryInput, files?: File[]) => void;

/* ------------------------------------------------------------------ Overview */

function Overview({
  list,
  opening,
  invoices,
  onOpen,
  go,
}: {
  list: Entry[];
  opening: { amount: number; on: string | null };
  invoices: ReturnType<typeof useAllInvoices>;
  onOpen: Open;
  go: (t: Tab) => void;
}) {
  const t = today();
  const s = summarise(list, t, opening);
  const top = Math.max(1, ...s.months.flatMap((m) => [m.in, m.out]));
  const owed = invoices.rows
    .filter((r) => r.status === "sent")
    .reduce((a, r) => a + num(r.total), 0);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const next = list
    .filter((e) => e.status === "planned" && (e.dueOn ?? "9999") <= in30)
    .sort((a, b) => (a.dueOn ?? "").localeCompare(b.dueOn ?? ""));
  const catTop = Math.max(1, ...s.byCategory.map((c) => c.total));
  const month = new Date().toLocaleDateString("en-GB", { month: "long" });
  return (
    <div className="fos-grid">
      <div className="fos-kpis">
        <div className="fos-kpi is-ink">
          <span>Balance now</span>
          <strong>{dt(s.balance)}</strong>
          <small>
            {opening.on
              ? `From ${dt(opening.amount)} on ${dayName(opening.on)}`
              : "Set the opening balance in Access"}
          </small>
        </div>
        <div className="fos-kpi">
          <span>In, {month}</span>
          <strong className="is-in">{dt(s.inMonth)}</strong>
          <small>Out {dt(s.outMonth)}</small>
        </div>
        <div className="fos-kpi">
          <span>Net, {month}</span>
          <strong className={s.net >= 0 ? "is-in" : "is-out"}>
            {s.net >= 0 ? "+" : "−"}
            {dt(Math.abs(s.net))}
          </strong>
          <small>
            {s.runway !== null
              ? `About ${s.runway} months of spending in the bank`
              : "Spending pace shows after a month"}
          </small>
        </div>
        <div className="fos-kpi">
          <span>TVA to pay, {month}</span>
          <strong>{dt(s.vatDue)}</strong>
          <small>
            Collected {dt(s.vatCollected)} · deductible {dt(s.vatDeductible)}
          </small>
        </div>
      </div>

      <div className="fos-row">
        <button type="button" className="fos-tile" onClick={() => go("todo")}>
          <span>To receive</span>
          <strong>{dt(s.toReceive + owed)}</strong>
          <small>
            {owed > 0 ? `${dt(owed)} on client invoices` : "From the ledger"}
            {s.overdueIn > 0 ? ` · ${dt(s.overdueIn)} late` : ""}
          </small>
        </button>
        <button type="button" className="fos-tile" onClick={() => go("todo")}>
          <span>To pay</span>
          <strong>{dt(s.toPay)}</strong>
          <small>{s.overdueOut > 0 ? `${dt(s.overdueOut)} late` : "Nothing late"}</small>
        </button>
        <button type="button" className="fos-tile" onClick={() => go("invoices")}>
          <span>Advanced for clients, not billed</span>
          <strong>{dt(invoices.unbilled)}</strong>
          <small>Production costs to put on invoices</small>
        </button>
        <button
          type="button"
          className={`fos-tile${s.missingReceipts ? " is-warn" : ""}`}
          onClick={() => go("factures")}
        >
          <span>Factures missing</span>
          <strong>{s.missingReceipts}</strong>
          <small>Paid amounts without a photo</small>
        </button>
      </div>

      <section className="fos-card fos-flow">
        <div className="fos-card-head">
          <h2>Cash flow, last 6 months</h2>
          <p className="fos-legend">
            <i className="is-in" /> In <i className="is-out" /> Out
          </p>
        </div>
        <div className="fos-bars" role="img" aria-label="Money in and out per month">
          {s.months.map((m) => (
            <div key={m.m} className="fos-bar">
              <div className="fos-bar-cols">
                <span
                  className="is-in"
                  style={{ height: `${(m.in / top) * 100}%` }}
                  title={`In ${dt(m.in)}`}
                />
                <span
                  className="is-out"
                  style={{ height: `${(m.out / top) * 100}%` }}
                  title={`Out ${dt(m.out)}`}
                />
              </div>
              <b>{monthName(m.m)}</b>
              <small className={m.in - m.out >= 0 ? "is-in" : "is-out"}>
                {m.in || m.out
                  ? `${m.in - m.out >= 0 ? "+" : "−"}${Math.round(Math.abs(m.in - m.out)).toLocaleString("fr-FR")}`
                  : ""}
              </small>
            </div>
          ))}
        </div>
      </section>

      <div className="fos-two">
        <section className="fos-card">
          <div className="fos-card-head">
            <h2>Where the money went, {month}</h2>
          </div>
          {s.byCategory.length === 0 ? (
            <p className="fos-none">Nothing paid this month yet.</p>
          ) : (
            <ul className="fos-cats">
              {s.byCategory.map((c) => (
                <li key={c.key}>
                  <span>{categoryLabel(c.key)}</span>
                  <span className="fos-cat-bar">
                    <i style={{ width: `${(c.total / catTop) * 100}%` }} />
                  </span>
                  <strong>{dt(c.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="fos-card">
          <div className="fos-card-head">
            <h2>Next 30 days</h2>
          </div>
          {next.length === 0 ? (
            <p className="fos-none">
              Nothing planned. Add what&rsquo;s due as &ldquo;to pay&rdquo; or &ldquo;to
              receive&rdquo;.
            </p>
          ) : (
            <ul className="fos-list">
              {next.slice(0, 8).map((e) => (
                <EntryLine key={e.id} e={e} onOpen={onOpen} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function EntryLine({ e, onOpen, action }: { e: Entry; onOpen: Open; action?: ReactNode }) {
  const t = today();
  return (
    <li className={`fos-line${isOverdue(e, t) ? " is-late" : ""}`}>
      <button type="button" onClick={() => onOpen(e)}>
        <span className={`fos-dir is-${e.kind}`} aria-label={e.kind === "in" ? "In" : "Out"}>
          {e.kind === "in" ? "↓" : "↑"}
        </span>
        <span className="fos-line-t">
          <strong dir="auto">{e.title}</strong>
          <small>
            {[
              e.counterparty,
              categoryLabel(e.category),
              e.status === "planned"
                ? e.dueOn
                  ? `due ${dayName(e.dueOn)}`
                  : "no date"
                : dayName(dayOf(e)),
            ]
              .filter(Boolean)
              .join(" · ")}
            {isOverdue(e, t) ? " · late" : ""}
          </small>
        </span>
        <span className={`fos-amt is-${e.kind}`}>
          {e.kind === "in" ? "+" : "−"}
          {dt(e.amount, e.amount % 1 ? 3 : 0)}
        </span>
      </button>
      {action}
    </li>
  );
}

/* ------------------------------------------------------------------ To do */

function ToDo({
  list,
  invoices,
  owner,
  onOpen,
}: {
  list: Entry[];
  invoices: InvoiceRow[];
  owner: boolean;
  onOpen: Open;
}) {
  const act = useFinanceActions();
  const byDue = (a: Entry, b: Entry) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999");
  const receive = list.filter((e) => e.status === "planned" && e.kind === "in").sort(byDue);
  const pay = list.filter((e) => e.status === "planned" && e.kind === "out").sort(byDue);
  const missing = list.filter(
    (e) => e.status === "done" && e.kind === "out" && e.receipts.length === 0,
  );
  const sent = invoices.filter((r) => r.status === "sent");
  const settle = (e: Entry) =>
    void act.settle
      .mutateAsync({ id: e.id, on: today() })
      .then(() =>
        toast({ text: e.kind === "in" ? "Marked received" : "Marked paid", detail: e.title }),
      )
      .catch((err) => toast({ text: friendlyError(err), tone: "error" }));
  const btn = (e: Entry) =>
    owner ? (
      <button type="button" className="fos-do" onClick={() => settle(e)}>
        {e.kind === "in" ? "Received" : "Paid"}
      </button>
    ) : null;
  return (
    <div className="fos-cols">
      <section className="fos-card">
        <div className="fos-card-head">
          <h2>To receive</h2>
          <span className="fos-n">{receive.length + sent.length}</span>
        </div>
        {receive.length + sent.length === 0 && (
          <p className="fos-none">Nobody owes Gecko anything.</p>
        )}
        <ul className="fos-list">
          {sent.map((r) => (
            <li key={r.id} className={`fos-line${r.overdue ? " is-late" : ""}`}>
              <Link to={`/clients/${encodeURIComponent(r.clientId)}/money`}>
                <span className="fos-dir is-in">↓</span>
                <span className="fos-line-t">
                  <strong dir="auto">
                    {r.number ?? "Invoice"} · {r.brand}
                  </strong>
                  <small>
                    Client invoice · due {r.dueDate}
                    {r.overdue ? " · late" : ""}
                  </small>
                </span>
                <span className="fos-amt is-in">+{dt(num(r.total))}</span>
              </Link>
            </li>
          ))}
          {receive.map((e) => (
            <EntryLine key={e.id} e={e} onOpen={onOpen} action={btn(e)} />
          ))}
        </ul>
      </section>
      <section className="fos-card">
        <div className="fos-card-head">
          <h2>To pay</h2>
          <span className="fos-n">{pay.length}</span>
        </div>
        {pay.length === 0 && <p className="fos-none">Nothing waiting to be paid.</p>}
        <ul className="fos-list">
          {pay.map((e) => (
            <EntryLine key={e.id} e={e} onOpen={onOpen} action={btn(e)} />
          ))}
        </ul>
      </section>
      <section className="fos-card">
        <div className="fos-card-head">
          <h2>Factures to collect</h2>
          <span className="fos-n">{missing.length}</span>
        </div>
        {missing.length === 0 && <p className="fos-none">Every payment has its facture.</p>}
        <ul className="fos-list">
          {missing.slice(0, 30).map((e) => (
            <EntryLine
              key={e.id}
              e={e}
              onOpen={onOpen}
              action={
                owner ? (
                  <button type="button" className="fos-do is-soft" onClick={() => onOpen(e)}>
                    Add photo
                  </button>
                ) : null
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Ledger */

function Ledger({ list, onOpen }: { list: Entry[]; onOpen: Open }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [status, setStatus] = useState<"all" | "done" | "planned">("all");
  const [month, setMonth] = useState("");
  const [cat, setCat] = useState("");
  const months = [...new Set(list.map((e) => dayOf(e).slice(0, 7)))].sort().reverse();
  const shown = list
    .filter(
      (e) =>
        (kind === "all" || e.kind === kind) &&
        (status === "all" || e.status === status) &&
        (!month || dayOf(e).startsWith(month)) &&
        (!cat || e.category === cat) &&
        (!q ||
          `${e.title} ${e.counterparty} ${e.reference} ${e.note}`
            .toLowerCase()
            .includes(q.toLowerCase())),
    )
    .sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
  const tin = shown.filter((e) => e.kind === "in").reduce((s, e) => s + e.amount, 0);
  const tout = shown.filter((e) => e.kind === "out").reduce((s, e) => s + e.amount, 0);
  const vat = shown.reduce(
    (s, e) => s + (e.kind === "in" ? 1 : -1) * vatOf(e.amount, e.vatRate),
    0,
  );

  function download() {
    const blob = new Blob(["﻿" + ledgerCsv(shown)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gecko-ledger-${month || today().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fos-grid">
      <div className="fos-filters">
        <input
          className="fos-search"
          value={q}
          placeholder="Search what, who, facture no."
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="fos-seg" role="group" aria-label="In or out">
          {(["all", "in", "out"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === "all" ? "All" : k === "in" ? "In" : "Out"}
            </button>
          ))}
        </div>
        <div className="fos-seg" role="group" aria-label="Status">
          {(["all", "done", "planned"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>
              {k === "all" ? "Any" : k === "done" ? "Done" : "Planned"}
            </button>
          ))}
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
          <option value="">Every month</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </option>
          ))}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">Every category</option>
          {[...CATEGORIES.in, ...CATEGORIES.out].map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={download} disabled={shown.length === 0}>
          Export for the accountant
        </Button>
      </div>
      {shown.length === 0 ? (
        <p className="fos-none fos-empty">
          Nothing here yet. Add money in or out with the buttons at the top.
        </p>
      ) : (
        <div className="fos-table-wrap">
          <table className="fos-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>What</th>
                <th>Category</th>
                <th>How</th>
                <th>Factures</th>
                <th className="num">HT</th>
                <th className="num">TVA</th>
                <th className="num">TTC</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => onOpen(e)}
                  className={e.status === "planned" ? "is-planned" : ""}
                >
                  <td>
                    {dayName(dayOf(e))}
                    {e.status === "planned" && (
                      <small>{e.kind === "in" ? "to receive" : "to pay"}</small>
                    )}
                  </td>
                  <td>
                    <strong dir="auto">{e.title}</strong>
                    {e.counterparty && <small dir="auto">{e.counterparty}</small>}
                  </td>
                  <td>{categoryLabel(e.category)}</td>
                  <td>{METHODS.find((m) => m.key === e.method)?.label ?? "–"}</td>
                  <td>
                    {e.receipts.length ? (
                      <span className="fos-has">{e.receipts.length}</span>
                    ) : e.kind === "out" && e.status === "done" ? (
                      <span className="fos-miss">missing</span>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="num">
                    {htOf(e.amount, e.vatRate).toLocaleString("fr-FR", {
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="num">
                    {e.vatRate
                      ? `${vatOf(e.amount, e.vatRate).toLocaleString("fr-FR", { maximumFractionDigits: 3 })}`
                      : "–"}
                  </td>
                  <td className={`num fos-amt is-${e.kind}`}>
                    {e.kind === "in" ? "+" : "−"}
                    {e.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  {shown.length} lines · in <strong className="is-in">{dt(tin)}</strong> · out{" "}
                  <strong className="is-out">{dt(tout)}</strong>
                </td>
                <td />
                <td className="num">{dt(vat)}</td>
                <td className="num">
                  <strong>{dt(tin - tout)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Client invoices */

function Invoices({
  invoices,
  list,
  owner,
  onOpen,
}: {
  invoices: ReturnType<typeof useAllInvoices>;
  list: Entry[];
  owner: boolean;
  onOpen: Open;
}) {
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "overdue" | "paid">("all");
  const logged = new Set(list.map((e) => e.reference).filter(Boolean));
  const shown = invoices.rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "overdue"
        ? r.status === "sent" && r.overdue
        : r.status === filter,
  );
  const sum = (f: (r: InvoiceRow) => boolean) =>
    invoices.rows.filter(f).reduce((s, r) => s + num(r.total), 0);
  return (
    <div className="fos-grid">
      <div className="fos-row">
        <div className="fos-tile">
          <span>Clients owe</span>
          <strong>{dt(sum((r) => r.status === "sent"))}</strong>
        </div>
        <div className="fos-tile">
          <span>Late</span>
          <strong>{dt(sum((r) => r.status === "sent" && r.overdue))}</strong>
        </div>
        <div className="fos-tile">
          <span>Drafts to send</span>
          <strong>{dt(sum((r) => r.status === "draft"))}</strong>
        </div>
        <div className="fos-tile">
          <span>Advanced, not billed</span>
          <strong>{dt(invoices.unbilled)}</strong>
        </div>
      </div>
      <div className="fos-filters">
        <div className="fos-seg" role="group" aria-label="Show">
          {(["all", "draft", "sent", "overdue", "paid"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f[0]!.toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <p className="fos-hint">Invoices are made on each client&rsquo;s Money page.</p>
      </div>
      {invoices.loading ? (
        <p className="loading">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="fos-none fos-empty">No invoices here.</p>
      ) : (
        <div className="fos-table-wrap">
          <table className="fos-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Client</th>
                <th>What</th>
                <th>Status</th>
                <th>Due</th>
                <th className="num">TTC</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const st = r.status === "sent" && r.overdue ? "overdue" : r.status;
                const inLedger = !!r.number && logged.has(r.number);
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
                    <td>
                      {owner && r.status === "paid" && !inLedger && (
                        <button
                          type="button"
                          className="fos-do is-soft"
                          onClick={() =>
                            onOpen(
                              null,
                              blankEntry("in", {
                                title: `${r.number ?? "Invoice"} · ${r.title}`,
                                category: "client",
                                counterparty: r.brand,
                                clientId: r.clientId,
                                amount: num(r.total),
                                vatRate:
                                  num(r.subtotal) > 0
                                    ? Math.round((num(r.taxTotal) / num(r.subtotal)) * 100)
                                    : 0,
                                reference: r.number ?? "",
                                doneOn: r.paidOn ?? today(),
                              }),
                            )
                          }
                        >
                          Log the payment
                        </button>
                      )}
                      {inLedger && <span className="fos-has">In the ledger</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Factures */

function Factures({ list, owner, onOpen }: { list: Entry[]; owner: boolean; onOpen: Open }) {
  const withFiles = list
    .filter((e) => e.receipts.length > 0)
    .sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
  const paths = withFiles.slice(0, 60).flatMap((e) => e.receipts.slice(0, 1));
  const urls = useReceiptUrls(paths);
  const missing = list.filter(
    (e) => e.status === "done" && e.kind === "out" && e.receipts.length === 0,
  );
  const [over, setOver] = useState(false);
  const take = (files: File[]) => {
    const ok = files.filter((f) => RECEIPT_TYPES.includes(f.type));
    if (ok.length) onOpen(null, blankEntry("out"), ok);
  };
  return (
    <div className="fos-grid">
      {owner && (
        <label
          className={`fos-drop${over ? " is-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(Array.from(e.dataTransfer.files));
          }}
        >
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            multiple
            hidden
            onChange={(e) => {
              take(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          <strong>Collect a facture</strong>
          <span>Snap it on your phone, or drop photos and PDFs here. Then say what it was.</span>
        </label>
      )}
      {missing.length > 0 && (
        <p className="fos-warn">
          {missing.length} paid {missing.length === 1 ? "amount has" : "amounts have"} no facture
          yet. Find them in <strong>To do</strong>.
        </p>
      )}
      {withFiles.length === 0 ? (
        <p className="fos-none fos-empty">No factures yet.</p>
      ) : (
        <ul className="fos-facts">
          {withFiles.slice(0, 60).map((e) => {
            const p = e.receipts[0]!;
            return (
              <li key={e.id}>
                <button type="button" onClick={() => onOpen(e)}>
                  <span className="fos-fact-img">
                    {p.endsWith(".pdf") ? (
                      <span className="fx-pdf">PDF</span>
                    ) : urls.data?.[p] ? (
                      <img src={urls.data[p]} alt="" loading="lazy" />
                    ) : null}
                    {e.receipts.length > 1 && <em>+{e.receipts.length - 1}</em>}
                  </span>
                  <strong dir="auto">{e.title}</strong>
                  <small>
                    {dayName(dayOf(e))} · {dt(e.amount)}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Calculator */

function Calculator() {
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState<"ht" | "ttc">("ht");
  const [rate, setRate] = useState(19);
  const [stamp, setStamp] = useState("1");
  const [wh, setWh] = useState("0");
  const r = vatCalc({
    amount: Number(amount.replace(",", ".")) || 0,
    from,
    rate,
    stamp: Number(stamp.replace(",", ".")) || 0,
    withholding: Number(wh.replace(",", ".")) || 0,
  });
  const [expr, setExpr] = useState("");
  const [tape, setTape] = useState<{ e: string; v: number }[]>([]);
  const live = calculate(expr);
  const copy = (n: number) =>
    void navigator.clipboard
      ?.writeText(String(n))
      .then(() => toast({ text: "Copied", detail: String(n) }))
      .catch(() => undefined);
  return (
    <div className="fos-two">
      <section className="fos-card">
        <div className="fos-card-head">
          <h2>TVA calculator</h2>
        </div>
        <div className="fos-calc-in">
          <label className="field">
            <span>Amount</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <div className="fos-seg" role="group" aria-label="The amount is">
            {(["ht", "ttc"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={from === k} onClick={() => setFrom(k)}>
                {k === "ht" ? "It's HT" : "It's TTC"}
              </button>
            ))}
          </div>
        </div>
        <div className="fos-seg fos-rates" role="group" aria-label="TVA rate">
          {VAT_RATES.map((v) => (
            <button key={v} type="button" aria-pressed={rate === v} onClick={() => setRate(v)}>
              {v}%
            </button>
          ))}
        </div>
        <div className="fos-calc-in">
          <label className="field">
            <span>Timbre fiscal (DT)</span>
            <input inputMode="decimal" value={stamp} onChange={(e) => setStamp(e.target.value)} />
          </label>
          <label className="field">
            <span>Retenue à la source (%)</span>
            <input inputMode="decimal" value={wh} onChange={(e) => setWh(e.target.value)} />
          </label>
        </div>
        <dl className="fos-calc-out">
          <div>
            <dt>HT</dt>
            <dd onClick={() => copy(r.ht)}>{dt(r.ht, 3)}</dd>
          </div>
          <div>
            <dt>TVA {rate}%</dt>
            <dd onClick={() => copy(r.vat)}>{dt(r.vat, 3)}</dd>
          </div>
          <div>
            <dt>TTC</dt>
            <dd onClick={() => copy(r.ttc)}>{dt(r.ttc, 3)}</dd>
          </div>
          <div>
            <dt>With the stamp</dt>
            <dd onClick={() => copy(r.total)}>{dt(r.total, 3)}</dd>
          </div>
          {r.withheld > 0 && (
            <div>
              <dt>Withheld by the client</dt>
              <dd onClick={() => copy(r.withheld)}>−{dt(r.withheld, 3)}</dd>
            </div>
          )}
          <div className="is-total">
            <dt>{r.withheld > 0 ? "You receive" : "Total to pay"}</dt>
            <dd onClick={() => copy(r.net)}>{dt(r.net, 3)}</dd>
          </div>
        </dl>
        <p className="fos-hint">
          Tunisian rates: 19% standard, 13% and 7% reduced. Stamp and withholding change with the
          finance law and the client: check them with the accountant. Click a number to copy it.
        </p>
      </section>
      <section className="fos-card">
        <div className="fos-card-head">
          <h2>Calculator</h2>
        </div>
        <form
          className="fos-calc"
          onSubmit={(e) => {
            e.preventDefault();
            if (live === null) return;
            setTape((t) => [{ e: expr, v: live }, ...t].slice(0, 12));
            setExpr(String(live));
          }}
        >
          <input
            value={expr}
            placeholder="2 900 × 3 + 15%"
            inputMode="decimal"
            aria-label="Sum"
            onChange={(e) => setExpr(e.target.value)}
          />
          <output>
            {live === null
              ? expr
                ? "…"
                : "0"
              : live.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
          </output>
        </form>
        <div className="fos-keys">
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "%", "+"].map(
            (k) => (
              <button
                key={k}
                type="button"
                onClick={() =>
                  setExpr((x) => x + (k === "−" ? "-" : k === "÷" ? "/" : k === "×" ? "*" : k))
                }
              >
                {k}
              </button>
            ),
          )}
          <button type="button" className="is-soft" onClick={() => setExpr("")}>
            C
          </button>
          <button type="button" className="is-soft" onClick={() => setExpr((x) => x.slice(0, -1))}>
            ⌫
          </button>
          <button
            type="button"
            className="is-eq"
            onClick={() => {
              if (live === null) return;
              setTape((t) => [{ e: expr, v: live }, ...t].slice(0, 12));
              setExpr(String(live));
            }}
          >
            =
          </button>
        </div>
        {tape.length > 0 && (
          <ul className="fos-tape">
            {tape.map((t, i) => (
              <li key={i}>
                <span>{t.e}</span>
                <button type="button" onClick={() => copy(t.v)}>
                  = {t.v.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Access */

function Access({ opening }: { opening: { amount: number; on: string | null } }) {
  const people = useFinancePeople(true);
  const act = useFinanceActions();
  const [amount, setAmount] = useState(String(opening.amount || ""));
  const [on, setOn] = useState(opening.on ?? today().slice(0, 8) + "01");
  const link = `${window.location.origin}/finance`;
  return (
    <div className="fos-two">
      <section className="fos-card">
        <div className="fos-card-head">
          <h2>Who can look</h2>
        </div>
        <p className="fos-hint">
          Only you can add, change or delete. People you let in see everything, read-only: an
          accountant or a partner. Then send them the link.
        </p>
        {people.isError && <Notice tone="error">{friendlyError(people.error)}</Notice>}
        <ul className="fos-people">
          {(people.data ?? []).map((p) => (
            <li key={p.member_id}>
              <span className="fos-av" aria-hidden="true">
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{p.name || p.member_id}</strong>
                <small>{p.role}</small>
              </span>
              <label className="fos-switch">
                <input
                  type="checkbox"
                  checked={p.can_view}
                  onChange={(e) =>
                    void act.viewer
                      .mutateAsync({ memberId: p.member_id, on: e.target.checked })
                      .then(() =>
                        toast({
                          text: e.target.checked
                            ? `${p.name} can look at Finance`
                            : `${p.name} can't see Finance anymore`,
                        }),
                      )
                      .catch((err) => toast({ text: friendlyError(err), tone: "error" }))
                  }
                />
                <span>{p.can_view ? "Can look" : "No access"}</span>
              </label>
            </li>
          ))}
          {people.data?.length === 0 && <li className="fos-none">Nobody else on the team yet.</li>}
        </ul>
        <div className="fos-link">
          <code>{link}</code>
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .then(() => toast({ text: "Link copied" }))
                .catch(() => toast({ text: "Couldn't copy", tone: "error" }))
            }
          >
            Copy the link
          </Button>
        </div>
      </section>
      <section className="fos-card">
        <div className="fos-card-head">
          <h2>Opening balance</h2>
        </div>
        <p className="fos-hint">
          What the bank account held on a day. The balance counts from there, so it matches the
          bank.
        </p>
        <div className="fos-calc-in">
          <label className="field">
            <span>Amount (DT)</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="field">
            <span>On</span>
            <input type="date" value={on} onChange={(e) => setOn(e.target.value)} />
          </label>
        </div>
        <Button
          onClick={() =>
            void act.opening
              .mutateAsync({
                amount: Number(amount.replace(/\s/g, "").replace(",", ".")) || 0,
                on: on || null,
              })
              .then(() => toast({ text: "Opening balance saved" }))
              .catch((e) => toast({ text: friendlyError(e), tone: "error" }))
          }
        >
          Save
        </Button>
      </section>
    </div>
  );
}
