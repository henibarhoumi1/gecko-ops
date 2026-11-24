import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { block } from "@/features/pages/blocks";
import { usePageActions } from "@/features/pages/pagesApi";
import { useMembers } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { missingRates, price, type Order, type Rates } from "./pricing";

const KEY = "gecko.rates.v1";
const EMPTY: Rates = {
  perReel: null,
  shootDay: null,
  ugcVideo: null,
  extraHook: null,
  cutdown: null,
  rush: null,
  taxPct: null,
};
const dt = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} DT`;

function loadRates(): Rates {
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Rates>) };
  } catch {
    return EMPTY;
  }
}

/** Price a package from Gecko's own rates, then turn it into a Gecko quote to share or accept online. */
export function Pricing() {
  const [rates, setRates] = useState<Rates>(loadRates);
  const [order, setOrder] = useState<Order>({
    reels: 10,
    shootDays: 1,
    ugc: 0,
    extraHooks: 0,
    cutdowns: 0,
    rush: false,
    discountPct: 0,
  });
  const [client, setClient] = useState("");
  const clients = useClients();
  const members = useMembers();
  const act = usePageActions();
  const navigate = useNavigate();
  const me = members.data?.find((m) => m.userId)?.name ?? "";
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(rates));
    } catch {
      /* private mode: rates just aren't remembered */
    }
  }, [rates]);
  const p = price(rates, order);
  const missing = missingRates(rates, order);

  const rate = (k: keyof Rates, label: string) => (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        value={rates[k] ?? ""}
        placeholder="—"
        onChange={(e) =>
          setRates({ ...rates, [k]: e.target.value === "" ? null : Number(e.target.value) })
        }
      />
    </label>
  );
  const qty = (k: Exclude<keyof Order, "rush">, label: string) => (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={k === "discountPct" ? 100 : 500}
        value={order[k]}
        onChange={(e) => setOrder({ ...order, [k]: Math.max(0, Number(e.target.value) || 0) })}
      />
    </label>
  );

  async function makeQuote() {
    const c = clients.data?.find((x) => x.brand === client);
    try {
      const id = await act.create.mutateAsync({
        title: `Quote · ${client || "Client"}`,
        icon: "receipt",
        kind: "doc",
        template: "quote",
        blocks: [
          block("field", `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, {
            label: "Quote no.",
          }),
          block("field", client, { label: "For" }),
          block("field", new Date(Date.now() + 14 * 86_400_000).toLocaleDateString("en-GB"), {
            label: "Valid until",
          }),
          block("h1", "The package"),
          ...p.lines.map((l) =>
            block("field", `${l.qty} × ${dt(l.unit)} = ${dt(l.total)}`, { label: l.label }),
          ),
          block("divider"),
          ...(p.discount
            ? [block("field", `− ${dt(p.discount)}`, { label: `Discount ${order.discountPct}%` })]
            : []),
          block("field", dt(p.net), { label: "Total (excl. tax)" }),
          ...(p.tax ? [block("field", dt(p.tax), { label: `VAT ${rates.taxPct}%` })] : []),
          block("field", dt(p.total), { label: "Total" }),
          block("field", dt(p.deposit), { label: "Deposit (50%)" }),
          block("h1", "Paid at cost, approved first"),
          block("bullet", "Talent and creators"),
          block("bullet", "Locations and studios"),
          block("bullet", "Gear rental and props"),
          block("h1", "Terms"),
          block("number", "50% to book the shoot date, 50% on delivery."),
          block("number", "Two rounds of changes per video are included."),
          block("callout", "To accept: open the link and type your name, or reply “yes”."),
        ],
        authorName: me,
        clientId: c?.id ?? null,
      });
      toast({
        text: "Quote ready",
        detail: "Share it from the page: “Share link”, they can accept online",
        celebrate: true,
      });
      navigate(`/pages/${id}`);
    } catch (e) {
      toast({ text: friendlyError(e), tone: "error" });
    }
  }

  return (
    <div className="pricing">
      <section className="today-section">
        <h2>Your rates</h2>
        <p className="small muted">Kept on this device. Leave empty what you don&rsquo;t sell.</p>
        <div className="builder-form">
          {rate("perReel", "Per reel (DT)")}
          {rate("shootDay", "Shoot day (DT)")}
          {rate("ugcVideo", "UGC video (DT)")}
          {rate("extraHook", "Extra hook (DT)")}
          {rate("cutdown", "Cutdown (DT)")}
          {rate("rush", "Rush delivery (DT)")}
          {rate("taxPct", "VAT (%)")}
        </div>
      </section>
      <section className="today-section">
        <h2>This package</h2>
        <div className="builder-form">
          <label className="field">
            <span>For</span>
            <input
              list="pricing-clients"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client or lead"
            />
            <datalist id="pricing-clients">
              {(clients.data ?? []).map((c) => (
                <option key={c.id} value={c.brand} />
              ))}
            </datalist>
          </label>
          {qty("reels", "Reels")}
          {qty("shootDays", "Shoot days")}
          {qty("ugc", "UGC videos")}
          {qty("extraHooks", "Extra hooks")}
          {qty("cutdowns", "Cutdowns")}
          {qty("discountPct", "Discount (%)")}
          <label className="check">
            <input
              type="checkbox"
              checked={order.rush}
              onChange={(e) => setOrder({ ...order, rush: e.target.checked })}
            />{" "}
            Rush
          </label>
        </div>
        <div className="price-sum">
          <div className="price-lines">
            {p.lines.map((l) => (
              <p key={l.label}>
                <span>
                  {l.label} <span className="small">× {l.qty}</span>
                </span>
                <strong>{dt(l.total)}</strong>
              </p>
            ))}
            {p.discount > 0 && (
              <p>
                <span>Discount</span>
                <strong>− {dt(p.discount)}</strong>
              </p>
            )}
            {p.tax > 0 && (
              <p>
                <span>VAT</span>
                <strong>{dt(p.tax)}</strong>
              </p>
            )}
          </div>
          <div className="price-total">
            <span className="small">Total</span>
            <strong>{dt(p.total)}</strong>
            <span className="small">Deposit {dt(p.deposit)}</span>
          </div>
        </div>
        {missing.length > 0 && (
          <p className="small shared-error">Add your rate for: {missing.join(", ")}.</p>
        )}
        <div className="actions">
          <Button
            onClick={() => void makeQuote()}
            disabled={act.create.isPending || missing.length > 0 || p.lines.length === 0}
          >
            Make the quote
          </Button>
        </div>
      </section>
    </div>
  );
}
