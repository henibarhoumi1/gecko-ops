// The pricing calculator's sums (Heni, 24 Nov 2026). Gecko's own rates are typed in once and kept on this device;
// nothing here is a made-up price.

export interface Rates {
  perReel: number | null;
  shootDay: number | null;
  ugcVideo: number | null;
  extraHook: number | null;
  cutdown: number | null;
  rush: number | null;
  taxPct: number | null;
}

export interface Order {
  reels: number;
  shootDays: number;
  ugc: number;
  extraHooks: number;
  cutdowns: number;
  rush: boolean;
  discountPct: number;
}

export interface Line {
  label: string;
  qty: number;
  unit: number;
  total: number;
}

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function price(rates: Rates, o: Order) {
  const lines: Line[] = [
    { label: "Reels (idea, script, edit)", qty: o.reels, unit: n(rates.perReel) },
    { label: "Shoot days", qty: o.shootDays, unit: n(rates.shootDay) },
    { label: "UGC videos", qty: o.ugc, unit: n(rates.ugcVideo) },
    { label: "Extra hooks", qty: o.extraHooks, unit: n(rates.extraHook) },
    { label: "Cutdowns (other formats)", qty: o.cutdowns, unit: n(rates.cutdown) },
    ...(o.rush ? [{ label: "Rush delivery", qty: 1, unit: n(rates.rush) }] : []),
  ]
    .filter((l) => l.qty > 0)
    .map((l) => ({ ...l, total: l.qty * l.unit }));
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discount = Math.round(subtotal * Math.min(Math.max(o.discountPct, 0), 100)) / 100;
  const net = subtotal - discount;
  const tax = Math.round(net * n(rates.taxPct)) / 100;
  return {
    lines,
    subtotal,
    discount,
    net,
    tax,
    total: net + tax,
    deposit: Math.round((net + tax) / 2),
  };
}

/** Rates still missing for what's ordered (so the quote never shows a 0 by accident). */
export function missingRates(rates: Rates, o: Order): string[] {
  const out: string[] = [];
  if (o.reels > 0 && rates.perReel == null) out.push("price per reel");
  if (o.shootDays > 0 && rates.shootDay == null) out.push("shoot day");
  if (o.ugc > 0 && rates.ugcVideo == null) out.push("UGC video");
  if (o.extraHooks > 0 && rates.extraHook == null) out.push("extra hook");
  if (o.cutdowns > 0 && rates.cutdown == null) out.push("cutdown");
  if (o.rush && rates.rush == null) out.push("rush");
  return out;
}
