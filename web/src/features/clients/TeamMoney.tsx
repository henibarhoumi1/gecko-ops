import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { InvoiceSheet } from "@/features/invoices/InvoiceSheet";
import {
  useInvoiceActions,
  useInvoices,
  useSettingsActions,
  type InvoiceTarget,
} from "@/features/invoices/invoicesApi";
import {
  kindLabel,
  longDate,
  money,
  sendBlockers,
  STATUS,
  statusOf,
  type Invoice,
  type InvoiceKind,
  type InvoiceLine,
  type InvoiceSettings,
  type TaxLine,
  type TeamInvoices,
} from "@/features/invoices/model";
import { printInvoice } from "@/features/invoices/printInvoice";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import type { Lang } from "@/lib/i18n";

const today = () => new Date().toLocaleDateString("en-CA");

const NEW: [InvoiceKind, string][] = [
  ["deposit", "Deposit"],
  ["balance", "Balance"],
  ["month", "This month"],
  ["extra", "Other"],
];

/** Money for one client: build invoices from the overview and Production, send them, record payments. */
export function TeamMoney({ clientId }: { clientId: string }) {
  const workspace = useWorkspace();
  const target = useMemo(() => ({ workspaceId: workspace.id, clientId }), [workspace.id, clientId]);
  const { invoiceId } = useParams();
  const page = useInvoices(target);
  const actions = useInvoiceActions(target);
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("fr");
  const base = `/clients/${clientId}/money`;
  const founder = workspace.role === "founder";

  if (page.isPending) return <p className="loading">Loading…</p>;
  if (page.isError) return <Notice tone="error">{friendlyError(page.error)}</Notice>;
  const data = page.data;

  if (invoiceId) {
    const invoice = data.invoices.find((i) => i.id === invoiceId);
    if (!invoice)
      return (
        <Notice>
          That invoice is gone. <Link to={base}>All invoices</Link>
        </Notice>
      );
    return <InvoiceScreen invoice={invoice} data={data} target={target} base={base} />;
  }

  const monthly = data.plan === "regular" || data.plan === "pro" || data.plan === "partner";
  const taken = (kind: InvoiceKind) =>
    (kind === "deposit" || kind === "balance") &&
    data.invoices.some((i) => i.kind === kind && i.status !== "void");
  const kinds = NEW.filter(
    ([kind]) => !taken(kind) && (kind !== "month" || monthly) && (kind !== "balance" || !monthly),
  );

  async function create(kind: InvoiceKind) {
    const id = await actions.create.mutateAsync({ kind, lang });
    navigate(`${base}/${id}`);
  }

  const open = data.invoices.filter((i) => i.status === "sent");
  return (
    <section className="tab-body">
      {!data.settings.taxesCheckedAt && (
        <Notice>
          Invoices can be built and checked here, but none can be sent until the accountant has
          checked the tax lines in Gecko's invoice details below.
        </Notice>
      )}
      <div className="money-strip">
        <span>
          <strong>{data.price != null ? money(data.price, "en") : "No price"}</strong>
          <span className="small muted">
            {monthly ? " a month" : " for the campaign"} · set in Overview
          </span>
        </span>
        <span className="small">
          Deposit{" "}
          <b className={`dot-${data.depositStatus ?? "due"}`}>{data.depositStatus ?? "—"}</b> ·
          Balance{" "}
          <b className={`dot-${data.balanceStatus ?? "later"}`}>{data.balanceStatus ?? "—"}</b>
        </span>
        {open.length > 0 && (
          <span className="small">
            {money(
              open.reduce((s, i) => s + Number(i.total), 0),
              "en",
            )}{" "}
            waiting to be paid
          </span>
        )}
      </div>

      <div className="money-new">
        <span className="small">New invoice in</span>
        <select
          aria-label="Invoice language"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          <option value="fr">French</option>
          <option value="en">English</option>
        </select>
        {kinds.map(([kind, label]) => (
          <Button
            key={kind}
            variant={kind === "extra" ? "secondary" : "primary"}
            disabled={actions.create.isPending}
            onClick={() => void create(kind).catch(() => undefined)}
          >
            {label}
          </Button>
        ))}
      </div>
      {data.openCosts.length > 0 && (
        <p className="small muted">
          {data.openCosts.length} cost{data.openCosts.length === 1 ? "" : "s"} from Production not
          invoiced yet (
          {money(
            data.openCosts.reduce((s, c) => s + Number(c.cost), 0),
            "en",
          )}
          ). The balance or this month's invoice picks them up.
        </p>
      )}
      {actions.create.error && <Notice tone="error">{friendlyError(actions.create.error)}</Notice>}

      {data.invoices.length === 0 ? (
        <p className="muted">No invoices for this client yet.</p>
      ) : (
        <ul className="invoice-list">
          {data.invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link to={`${base}/${invoice.id}`} className={`invoice-row is-${statusOf(invoice)}`}>
                <span className="invoice-row-main">
                  <strong>{invoice.number ?? "Draft"}</strong>
                  <span className="small muted" dir="auto">
                    {[
                      kindLabel(invoice.kind, "en"),
                      invoice.title,
                      longDate(invoice.issueDate, "en"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · {invoice.lang === "fr" ? "French" : "English"}
                  </span>
                </span>
                <span className="invoice-row-total">{money(invoice.total, "en")}</span>
                <span className="invoice-status">{STATUS[statusOf(invoice)][0]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <GeckoDetails settings={data.settings} target={target} founder={founder} />
    </section>
  );
}

function InvoiceScreen({
  invoice,
  data,
  target,
  base,
}: {
  invoice: Invoice;
  data: TeamInvoices;
  target: InvoiceTarget;
  base: string;
}) {
  const actions = useInvoiceActions(target);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Invoice>(invoice);
  // A save or a send refreshes the invoice from the server.
  useEffect(() => setDraft(invoice), [invoice]);
  const shown = invoice.status === "draft" ? { ...draft, taxes: data.settings.taxes } : invoice;
  const failed =
    actions.save.error ??
    actions.send.error ??
    actions.paid.error ??
    actions.cancel.error ??
    actions.remove.error;

  return (
    <section className="tab-body">
      <div className="inv-toolbar">
        <Link to={base} className="small">
          ← All invoices
        </Link>
        <Button variant="secondary" onClick={() => printInvoice(shown)}>
          {invoice.status === "draft" ? "Print a proof" : "Download PDF"}
        </Button>
      </div>
      {failed && <Notice tone="error">{friendlyError(failed)}</Notice>}
      <div className={invoice.status === "draft" ? "inv-work" : ""}>
        {invoice.status === "draft" && (
          <DraftEditor
            draft={draft}
            setDraft={setDraft}
            data={data}
            saving={actions.save.isPending}
            onSave={() =>
              actions.save.mutateAsync({
                id: invoice.id,
                patch: {
                  lang: draft.lang,
                  title: draft.title,
                  issueDate: draft.issueDate,
                  dueDate: draft.dueDate,
                  billTo: draft.billTo,
                  lines: draft.lines.map((l) => ({
                    ...l,
                    qty: Number(l.qty),
                    unit: Number(l.unit),
                  })),
                  note: draft.note,
                },
              })
            }
            onSend={async () => {
              await actions.send.mutateAsync(invoice.id);
            }}
            onDelete={async () => {
              await actions.remove.mutateAsync(invoice.id);
              navigate(base);
            }}
            dirty={JSON.stringify(draft) !== JSON.stringify(invoice)}
          />
        )}
        <div className="inv-paper">
          <InvoiceSheet
            invoice={shown}
            seller={{
              name: data.settings.legalName,
              address: data.settings.address,
              taxId: data.settings.taxId,
              contact: data.settings.contact,
              payment: data.settings.payment,
            }}
          />
        </div>
      </div>
      {invoice.status !== "draft" && <AfterSending invoice={invoice} target={target} />}
    </section>
  );
}

function DraftEditor({
  draft,
  setDraft,
  data,
  saving,
  dirty,
  onSave,
  onSend,
  onDelete,
}: {
  draft: Invoice;
  setDraft: (next: Invoice) => void;
  data: TeamInvoices;
  saving: boolean;
  dirty: boolean;
  onSave: () => Promise<unknown>;
  onSend: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = (patch: Partial<Invoice>) => setDraft({ ...draft, ...patch });
  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    set({ lines: draft.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const blockers = sendBlockers(data.settings, draft);
  const usedCosts = new Set(draft.lines.map((l) => l.optionId).filter(Boolean));
  const addable = data.openCosts.filter((c) => !usedCosts.has(c.id));

  async function save(e: FormEvent) {
    e.preventDefault();
    await onSave().catch(() => undefined);
  }

  return (
    <form className="inv-editor card" onSubmit={save}>
      <h3>Draft</h3>
      <p className="small muted">Only the team sees a draft. Sending gives it its number.</p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="inv-lang">Language</label>
          <select
            id="inv-lang"
            value={draft.lang}
            onChange={(e) => set({ lang: e.target.value as Lang })}
          >
            <option value="fr">French</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="inv-issue">Date</label>
          <input
            id="inv-issue"
            type="date"
            value={draft.issueDate}
            max={today()}
            onChange={(e) => set({ issueDate: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="inv-due">Due</label>
          <input
            id="inv-due"
            type="date"
            value={draft.dueDate}
            min={draft.issueDate}
            onChange={(e) => set({ dueDate: e.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="inv-title">Subject (optional)</label>
        <input
          id="inv-title"
          value={draft.title}
          maxLength={160}
          placeholder="Acompte, campagne de novembre"
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>

      <fieldset className="inv-fieldset">
        <legend>Billed to</legend>
        <div className="field">
          <label htmlFor="inv-to-name">Company name</label>
          <input
            id="inv-to-name"
            value={draft.billTo.name ?? ""}
            maxLength={160}
            onChange={(e) => set({ billTo: { ...draft.billTo, name: e.target.value } })}
          />
        </div>
        <div className="field">
          <label htmlFor="inv-to-address">Address</label>
          <textarea
            id="inv-to-address"
            rows={2}
            maxLength={400}
            value={draft.billTo.address ?? ""}
            onChange={(e) => set({ billTo: { ...draft.billTo, address: e.target.value } })}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="inv-to-tax">Their tax ID</label>
            <input
              id="inv-to-tax"
              value={draft.billTo.taxId ?? ""}
              maxLength={60}
              onChange={(e) => set({ billTo: { ...draft.billTo, taxId: e.target.value } })}
            />
          </div>
          <div className="field">
            <label htmlFor="inv-to-email">Email</label>
            <input
              id="inv-to-email"
              type="email"
              value={draft.billTo.email ?? ""}
              maxLength={160}
              onChange={(e) => set({ billTo: { ...draft.billTo, email: e.target.value } })}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="inv-fieldset">
        <legend>Lines</legend>
        {draft.lines.map((line, i) => (
          <div key={i} className="inv-line-edit">
            <input
              aria-label={`Line ${i + 1}`}
              value={line.label}
              maxLength={200}
              onChange={(e) => setLine(i, { label: e.target.value })}
            />
            <input
              aria-label={`Quantity, line ${i + 1}`}
              className="num"
              type="number"
              min="0.001"
              step="any"
              value={line.qty}
              onChange={(e) => setLine(i, { qty: e.target.value as unknown as number })}
            />
            <input
              aria-label={`Unit price in DT, line ${i + 1}`}
              className="num"
              type="number"
              step="0.001"
              value={line.unit}
              onChange={(e) => setLine(i, { unit: e.target.value as unknown as number })}
            />
            <label className="small" title="Rate taxes (VAT) apply to this line">
              <input
                type="checkbox"
                checked={line.taxed !== false}
                onChange={(e) => setLine(i, { taxed: e.target.checked })}
              />{" "}
              VAT
            </label>
            <Button
              variant="link"
              aria-label={`Remove line ${i + 1}`}
              onClick={() => set({ lines: draft.lines.filter((_, j) => j !== i) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <div className="inv-line-add">
          <Button
            variant="link"
            onClick={() =>
              set({ lines: [...draft.lines, { label: "", qty: 1, unit: 0, taxed: true }] })
            }
          >
            + Add a line
          </Button>
          {addable.map((c) => (
            <Button
              key={c.id}
              variant="link"
              onClick={() =>
                set({
                  lines: [
                    ...draft.lines,
                    {
                      label: c.name,
                      detail:
                        draft.lang === "fr"
                          ? "Avancé par Gecko pour votre compte"
                          : "Paid by Gecko on your behalf",
                      qty: 1,
                      unit: Number(c.cost),
                      taxed: false,
                      optionId: c.id,
                    },
                  ],
                })
              }
            >
              + {c.name} ({money(c.cost, "en")})
            </Button>
          ))}
        </div>
        <p className="small muted">
          Talent, locations and props Gecko paid stay untaxed by default. Ask the accountant if
          that's right for us.
        </p>
      </fieldset>

      <div className="field">
        <label htmlFor="inv-note">Note on the invoice (optional)</label>
        <textarea
          id="inv-note"
          rows={2}
          maxLength={1000}
          value={draft.note}
          onChange={(e) => set({ note: e.target.value })}
        />
      </div>

      <div className="screen-form-row">
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : dirty ? "Save draft" : "Saved"}
        </Button>
        {deleting ? (
          <span className="small">
            Delete this draft?{" "}
            <Button
              variant="link"
              className="danger"
              onClick={() => void onDelete().catch(() => undefined)}
            >
              Yes, delete
            </Button>{" "}
            <Button variant="link" onClick={() => setDeleting(false)}>
              Keep it
            </Button>
          </span>
        ) : (
          <Button variant="link" onClick={() => setDeleting(true)}>
            Delete draft
          </Button>
        )}
      </div>

      <div className="inv-send">
        <h3>Send to the client</h3>
        {dirty ? (
          <p className="small muted">Save the draft first.</p>
        ) : blockers.length > 0 ? (
          <ul className="small inv-blockers">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : sending ? (
          <p className="small">
            It gets its number and shows up in the client's Money page straight away. After that it
            can't be edited, only cancelled.{" "}
            <Button onClick={() => void onSend().catch(() => undefined)}>Yes, send it</Button>{" "}
            <Button variant="link" onClick={() => setSending(false)}>
              Not yet
            </Button>
          </p>
        ) : (
          <Button onClick={() => setSending(true)}>Send</Button>
        )}
      </div>
    </form>
  );
}

function AfterSending({ invoice, target }: { invoice: Invoice; target: InvoiceTarget }) {
  const actions = useInvoiceActions(target);
  const [on, setOn] = useState(today());
  const [how, setHow] = useState("");
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  if (invoice.status === "void")
    return (
      <p className="small muted inv-after">
        Cancelled {longDate(invoice.voidedAt, "en")}: {invoice.voidReason}. The number stays used.
      </p>
    );

  if (invoice.status === "paid")
    return (
      <div className="inv-after card">
        <p>
          Paid {longDate(invoice.paidOn, "en")}
          {invoice.paidHow && <>, {invoice.paidHow}</>}.
          {invoice.kind === "balance" && " The client can open their final files."}
        </p>
        <Button
          variant="link"
          disabled={actions.paid.isPending}
          onClick={() => actions.paid.mutate({ id: invoice.id, paid: false, on: null, how: "" })}
        >
          Marked by mistake? Mark it unpaid
        </Button>
      </div>
    );

  return (
    <div className="inv-after card">
      <form
        className="inv-paid-form"
        onSubmit={(e) => {
          e.preventDefault();
          actions.paid.mutate({ id: invoice.id, paid: true, on, how });
        }}
      >
        <h3>Record the payment</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="paid-on">Received on</label>
            <input
              id="paid-on"
              type="date"
              value={on}
              max={today()}
              onChange={(e) => setOn(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="paid-how">How</label>
            <input
              id="paid-how"
              value={how}
              maxLength={120}
              list="paid-ways"
              placeholder="Bank transfer"
              onChange={(e) => setHow(e.target.value)}
            />
            <datalist id="paid-ways">
              <option value="Bank transfer" />
              <option value="Cash" />
              <option value="Cheque" />
              <option value="D17" />
            </datalist>
          </div>
        </div>
        <Button type="submit" disabled={actions.paid.isPending}>
          Mark paid
        </Button>
        {invoice.kind === "balance" && (
          <p className="small muted">
            Marking the balance paid opens the final files to the client.
          </p>
        )}
      </form>
      <div className="inv-cancel small">
        {cancelling ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actions.cancel.mutate({ id: invoice.id, reason });
            }}
          >
            <label htmlFor="void-reason">Why cancel it? The client sees it marked cancelled.</label>
            <input
              id="void-reason"
              value={reason}
              maxLength={300}
              placeholder="Wrong location cost, replaced by a new invoice"
              onChange={(e) => setReason(e.target.value)}
            />
            <Button type="submit" variant="link" className="danger" disabled={!reason.trim()}>
              Cancel invoice {invoice.number}
            </Button>{" "}
            <Button variant="link" onClick={() => setCancelling(false)}>
              Keep it
            </Button>
          </form>
        ) : (
          <Button variant="link" onClick={() => setCancelling(true)}>
            Cancel this invoice
          </Button>
        )}
      </div>
    </div>
  );
}

/** Gecko's own details on every invoice, and the tax lines the accountant signs off. */
function GeckoDetails({
  settings,
  target,
  founder,
}: {
  settings: InvoiceSettings;
  target: InvoiceTarget;
  founder: boolean;
}) {
  const actions = useSettingsActions(target);
  const [form, setForm] = useState(settings);
  const [by, setBy] = useState("");
  // Open the first time, while Gecko's details are still empty; after that it's the reader's to open.
  const [open] = useState(!settings.legalName);
  useEffect(() => setForm(settings), [settings]);
  const set = (patch: Partial<InvoiceSettings>) => setForm({ ...form, ...patch });
  const setTax = (i: number, patch: Partial<TaxLine>) =>
    set({ taxes: form.taxes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  const taxesChanged = JSON.stringify(form.taxes) !== JSON.stringify(settings.taxes);

  return (
    <details className="gecko-details card" open={open}>
      <summary>
        <strong>Gecko's invoice details</strong>{" "}
        <span className="small muted">
          {settings.taxesCheckedAt
            ? `Tax lines checked by ${settings.taxesCheckedBy}, ${longDate(settings.taxesCheckedAt, "en")}`
            : "Tax lines not checked by the accountant yet"}
        </span>
      </summary>
      {!founder && <p className="small muted">Only the founder edits these.</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          actions.save.mutate({
            legalName: form.legalName,
            address: form.address,
            taxId: form.taxId,
            contact: form.contact,
            payment: form.payment,
            dueDays: Number(form.dueDays),
            taxes: form.taxes.map((x) => ({
              label: x.label,
              kind: x.kind,
              value: Number(x.value),
            })),
          });
        }}
      >
        <fieldset disabled={!founder} className="inv-fieldset plain">
          <div className="field-row">
            <div className="field">
              <label htmlFor="g-name">Legal name</label>
              <input
                id="g-name"
                value={form.legalName}
                maxLength={160}
                placeholder="As on the patente"
                onChange={(e) => set({ legalName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="g-tax">Tax ID (matricule fiscal)</label>
              <input
                id="g-tax"
                value={form.taxId}
                maxLength={60}
                onChange={(e) => set({ taxId: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="g-address">Address</label>
            <textarea
              id="g-address"
              rows={2}
              maxLength={400}
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="g-contact">Contact line</label>
            <input
              id="g-contact"
              value={form.contact}
              maxLength={200}
              placeholder="Email · phone"
              onChange={(e) => set({ contact: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="g-pay">How to pay (printed on every invoice)</label>
            <textarea
              id="g-pay"
              rows={3}
              maxLength={1000}
              value={form.payment}
              placeholder={"Bank transfer to …, RIB …\nCash or cheque at the studio"}
              onChange={(e) => set({ payment: e.target.value })}
            />
          </div>
          <div className="field narrow">
            <label htmlFor="g-due">Days to pay</label>
            <input
              id="g-due"
              type="number"
              min={0}
              max={90}
              value={form.dueDays}
              onChange={(e) => set({ dueDays: e.target.value as unknown as number })}
            />
          </div>

          <h3>Tax lines</h3>
          <p className="small muted">
            A rate applies to the lines ticked VAT; a fixed amount, like a stamp, is added once per
            invoice. Leave it empty if the accountant says none apply.
          </p>
          {form.taxes.map((tx, i) => (
            <div key={i} className="inv-line-edit tax">
              <input
                aria-label={`Tax ${i + 1} name`}
                value={tx.label}
                maxLength={80}
                placeholder="TVA"
                onChange={(e) => setTax(i, { label: e.target.value })}
              />
              <select
                aria-label={`Tax ${i + 1} kind`}
                value={tx.kind}
                onChange={(e) => setTax(i, { kind: e.target.value as TaxLine["kind"] })}
              >
                <option value="rate">% of taxed lines</option>
                <option value="fixed">DT per invoice</option>
              </select>
              <input
                aria-label={`Tax ${i + 1} value`}
                className="num"
                type="number"
                min={0}
                step="any"
                value={tx.value}
                onChange={(e) => setTax(i, { value: e.target.value as unknown as number })}
              />
              <Button
                variant="link"
                onClick={() => set({ taxes: form.taxes.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </div>
          ))}
          {form.taxes.length < 5 && (
            <Button
              variant="link"
              onClick={() => set({ taxes: [...form.taxes, { label: "", kind: "rate", value: 0 }] })}
            >
              + Add a tax line
            </Button>
          )}
          {taxesChanged && settings.taxesCheckedAt && (
            <p className="small error-text">
              Saving new tax lines asks for the accountant's check again.
            </p>
          )}
          <div className="screen-form-row">
            <Button type="submit" disabled={!dirty || actions.save.isPending}>
              Save details
            </Button>
          </div>
        </fieldset>
      </form>
      {actions.save.error && <Notice tone="error">{friendlyError(actions.save.error)}</Notice>}

      {founder && !dirty && (
        <div className="inv-check">
          {settings.taxesCheckedAt ? (
            <p className="small">
              The accountant's check is on record ({settings.taxesCheckedBy}).{" "}
              <Button
                variant="link"
                onClick={() => actions.check.mutate({ checked: false, by: "" })}
              >
                Take it back
              </Button>
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                actions.check.mutate({ checked: true, by });
              }}
            >
              <label htmlFor="g-by" className="small">
                Once the accountant has read these tax lines, write who checked them. This unlocks
                sending.
              </label>
              <div className="screen-form-row">
                <input
                  id="g-by"
                  value={by}
                  maxLength={120}
                  placeholder="Accountant's name"
                  onChange={(e) => setBy(e.target.value)}
                />
                <Button type="submit" disabled={!by.trim() || actions.check.isPending}>
                  The accountant checked them
                </Button>
              </div>
            </form>
          )}
          {actions.check.error && (
            <Notice tone="error">{friendlyError(actions.check.error)}</Notice>
          )}
        </div>
      )}
    </details>
  );
}
