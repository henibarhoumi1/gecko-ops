// Adding or changing one amount in the ledger, in a side panel: in or out, paid or still to pay, the VAT worked out
// as you type, who it's with, how it was paid, and the factures (snap, drop or paste them).
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import {
  RECEIPT_TYPES,
  uploadReceipt,
  useFinanceActions,
  useReceiptUrls,
  type EntryInput,
} from "./financeApi";
import { CATEGORIES, dt, htOf, METHODS, VAT_RATES, vatOf, type Entry, type Kind } from "./model";

const today = () => new Date().toISOString().slice(0, 10);

export function blankEntry(kind: Kind, patch: Partial<EntryInput> = {}): EntryInput {
  return {
    kind,
    status: "done",
    title: "",
    category: kind === "in" ? "client" : "other",
    counterparty: "",
    clientId: null,
    amount: 0,
    vatRate: 19,
    method: "transfer",
    reference: "",
    dueOn: null,
    doneOn: today(),
    note: "",
    receipts: [],
    ...patch,
  };
}

export function EntryPanel({
  entry,
  start,
  files,
  counterparties,
  onClose,
}: {
  /** An entry to change, or none for a new one. */
  entry: Entry | null;
  start: EntryInput;
  /** Factures dropped or snapped before the panel opened. */
  files?: File[];
  counterparties: string[];
  onClose: () => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const clients = useClients();
  const act = useFinanceActions();
  const [v, setV] = useState<EntryInput>(entry ? { ...entry } : start);
  const [typed, setTyped] = useState(String(entry?.amount || start.amount || ""));
  const [entered, setEntered] = useState<"ttc" | "ht">("ttc");
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const snap = useRef<HTMLInputElement>(null);
  const urls = useReceiptUrls(v.receipts);
  const set = <K extends keyof EntryInput>(k: K, val: EntryInput[K]) =>
    setV((x) => ({ ...x, [k]: val }));

  const raw = Number(typed.replace(/\s/g, "").replace(",", ".")) || 0;
  const ttc = entered === "ttc" ? raw : Math.round(raw * (1 + v.vatRate / 100) * 1000) / 1000;

  async function add(list: File[]) {
    const ok = list.filter((f) => RECEIPT_TYPES.includes(f.type)).slice(0, 12 - v.receipts.length);
    if (!ok.length) return;
    setBusy((n) => n + ok.length);
    for (const f of ok) {
      try {
        const path = await uploadReceipt(workspaceId, f);
        setV((x) => ({ ...x, receipts: [...x.receipts, path] }));
      } catch (e) {
        toast({ text: friendlyError(e), tone: "error" });
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  // Factures handed over when the panel opened (a snap from the Factures tab).
  const firstFiles = useRef(files);
  useEffect(() => {
    if (firstFiles.current?.length) void add(firstFiles.current);
    firstFiles.current = undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A facture pasted anywhere while the panel is open lands here.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const list = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        RECEIPT_TYPES.includes(f.type),
      );
      if (!list.length) return;
      e.preventDefault();
      void add(list);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  });

  async function save() {
    if (!v.title.trim()) return toast({ text: "Say what it is", tone: "error" });
    if (ttc <= 0) return toast({ text: "Add the amount", tone: "error" });
    const out = { ...v, amount: ttc, doneOn: v.status === "done" ? v.doneOn || today() : null };
    try {
      if (entry) await act.save.mutateAsync({ id: entry.id, ...out });
      else await act.add.mutateAsync(out);
      toast({ text: entry ? "Saved" : v.kind === "in" ? "Money in added" : "Money out added" });
      onClose();
    } catch (e) {
      toast({ text: friendlyError(e), tone: "error" });
    }
  }

  const words =
    v.kind === "in"
      ? { done: "Received", planned: "To receive", who: "From", date: "Received on" }
      : { done: "Paid", planned: "To pay", who: "Paid to", date: "Paid on" };

  return (
    <div className="fx-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        className={`fx-panel${over ? " is-over" : ""}`}
        role="dialog"
        aria-label={entry ? "Change an amount" : "Add an amount"}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void add(Array.from(e.dataTransfer.files));
        }}
      >
        <header className="fx-head">
          <div className="fx-seg" role="group" aria-label="In or out">
            {(["in", "out"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={v.kind === k}
                className={`is-${k}`}
                onClick={() =>
                  setV((x) => ({
                    ...x,
                    kind: k,
                    category:
                      k === "in" ? "client" : x.category === "client" ? "other" : x.category,
                  }))
                }
              >
                {k === "in" ? "Money in" : "Money out"}
              </button>
            ))}
          </div>
          <button type="button" className="fx-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="fx-body">
          <label className="fx-amount">
            <span>Amount</span>
            <span className="fx-amount-in">
              <input
                inputMode="decimal"
                autoFocus={!entry}
                value={typed}
                placeholder="0"
                onChange={(e) => setTyped(e.target.value)}
              />
              <em>DT</em>
            </span>
            <span className="fx-ttc-switch" role="group" aria-label="The amount is">
              {(["ttc", "ht"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={entered === k}
                  onClick={() => setEntered(k)}
                >
                  {k === "ttc" ? "TTC" : "HT"}
                </button>
              ))}
            </span>
          </label>

          <div className="fx-vat">
            <span>TVA</span>
            {VAT_RATES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={v.vatRate === r}
                onClick={() => set("vatRate", r)}
              >
                {r}%
              </button>
            ))}
            <p className="fx-split">
              HT <strong>{dt(htOf(ttc, v.vatRate), 3)}</strong> · TVA{" "}
              <strong>{dt(vatOf(ttc, v.vatRate), 3)}</strong> · TTC <strong>{dt(ttc, 3)}</strong>
            </p>
          </div>

          <div className="fx-seg fx-status" role="group" aria-label="Status">
            {(["done", "planned"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={v.status === s}
                onClick={() => set("status", s)}
              >
                {s === "done" ? words.done : words.planned}
              </button>
            ))}
          </div>

          <label className="field">
            <span>What</span>
            <input
              value={v.title}
              maxLength={200}
              placeholder={
                v.kind === "in" ? "Deposit, Dany Clean launch" : "Studio for the 29 Nov shoot"
              }
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <div className="fx-two">
            <label className="field">
              <span>Category</span>
              <select value={v.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES[v.kind].map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{words.who}</span>
              <input
                list="fx-who"
                value={v.counterparty}
                maxLength={160}
                onChange={(e) => set("counterparty", e.target.value)}
              />
              <datalist id="fx-who">
                {[...new Set([...(clients.data ?? []).map((c) => c.brand), ...counterparties])].map(
                  (n) => (
                    <option key={n} value={n} />
                  ),
                )}
              </datalist>
            </label>
          </div>
          <div className="fx-two">
            <label className="field">
              <span>For a client</span>
              <select
                value={v.clientId ?? ""}
                onChange={(e) => set("clientId", e.target.value || null)}
              >
                <option value="">Gecko itself</option>
                {(clients.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>How</span>
              <select
                value={v.method}
                onChange={(e) => set("method", e.target.value as EntryInput["method"])}
              >
                <option value="">Not yet</option>
                {METHODS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="fx-two">
            {v.status === "done" ? (
              <label className="field">
                <span>{words.date}</span>
                <input
                  type="date"
                  value={v.doneOn ?? ""}
                  onChange={(e) => set("doneOn", e.target.value || null)}
                />
              </label>
            ) : (
              <label className="field">
                <span>Due</span>
                <input
                  type="date"
                  value={v.dueOn ?? ""}
                  onChange={(e) => set("dueOn", e.target.value || null)}
                />
              </label>
            )}
            <label className="field">
              <span>Facture or reference no.</span>
              <input
                value={v.reference}
                maxLength={80}
                onChange={(e) => set("reference", e.target.value)}
              />
            </label>
          </div>

          <div className="fx-files">
            <p className="fx-files-k">
              Factures <span>{v.receipts.length}</span>
            </p>
            <div className="fx-thumbs">
              {v.receipts.map((p) => (
                <span key={p} className="fx-thumb">
                  {p.endsWith(".pdf") ? (
                    <a
                      href={urls.data?.[p]}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="fx-pdf"
                    >
                      PDF
                    </a>
                  ) : urls.data?.[p] ? (
                    <a href={urls.data[p]} target="_blank" rel="noreferrer noopener">
                      <img src={urls.data[p]} alt="Facture" />
                    </a>
                  ) : (
                    <span className="fx-pdf">…</span>
                  )}
                  <button
                    type="button"
                    aria-label="Remove this facture"
                    onClick={() =>
                      set(
                        "receipts",
                        v.receipts.filter((x) => x !== p),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
              {busy > 0 && <span className="fx-thumb fx-pdf">Adding…</span>}
              {v.receipts.length < 12 && (
                <>
                  <button
                    type="button"
                    className="fx-add-file"
                    onClick={() => snap.current?.click()}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path
                        d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Snap
                  </button>
                  <button
                    type="button"
                    className="fx-add-file"
                    onClick={() => pick.current?.click()}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path
                        d="M12 16V4M7 9l5-5 5 5M5 20h14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Upload
                  </button>
                </>
              )}
            </div>
            <p className="fx-hint">Drop, paste (⌘V) or snap photos or PDFs of the facture.</p>
            <input
              ref={snap}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void add(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <input
              ref={pick}
              type="file"
              accept={RECEIPT_TYPES.join(",")}
              multiple
              hidden
              onChange={(e) => {
                void add(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </div>

          <label className="field">
            <span>Note</span>
            <textarea
              rows={2}
              value={v.note}
              maxLength={2000}
              onChange={(e) => set("note", e.target.value)}
            />
          </label>
        </div>

        <footer className="fx-foot">
          {entry && (
            <button
              type="button"
              className="fx-delete"
              onClick={() => {
                if (!window.confirm("Delete this amount and its factures? This can't be undone."))
                  return;
                void act.remove
                  .mutateAsync(entry)
                  .then(() => {
                    toast({ text: "Deleted" });
                    onClose();
                  })
                  .catch((e) => toast({ text: friendlyError(e), tone: "error" }));
              }}
            >
              Delete
            </button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={busy > 0 || act.add.isPending || act.save.isPending}
          >
            {entry ? "Save" : "Add"}
          </Button>
        </footer>
      </aside>
    </div>
  );
}
