// The growth tools' screens (logic in growth.ts): a month of Andromeda-aligned creative, the ad doctor, profit and
// budget with cash on delivery, the reel score, safe zones on your own frame, and the hook lab.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { block, type Block } from "@/features/pages/blocks";
import { usePageActions } from "@/features/pages/pagesApi";
import { useMembers } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { imageFrom } from "@/lib/media";
import {
  BENCH,
  creativePlan,
  diagnose,
  economics,
  hookLab,
  reelScore,
  RULE_OF_THUMB,
  SAFE_ZONES,
  SURFACE_LABEL,
  VERDICT_LABEL,
  type AdRow,
  type Economics,
  type Grade,
  type PlanGoal,
  type Surface,
} from "./growth";
import { campaignMix, STAGE_LABEL, type Goal } from "./strategy";

const dt = (n: number | null, d = 0) =>
  n === null || !Number.isFinite(n)
    ? "–"
    : `${n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d })} DT`;
const pct = (n: number | null, d = 1) => (n === null ? "–" : `${(n * 100).toFixed(d)}%`);

function Num({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="field gt-num">
      <span>{label}</span>
      <span className="gt-num-in">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        {suffix && <em>{suffix}</em>}
      </span>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Stat({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: "pink" | "ink" }) {
  return (
    <div className={`gt-stat${tone ? ` is-${tone}` : ""}`}>
      <span>{k}</span>
      <strong>{v}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/* ------------------------------------------------------------------ Creative plan */

const PLAN_GOALS: [PlanGoal, string][] = [
  ["sales", "Sell more now"],
  ["launch", "Launch a product"],
  ["leads", "Leads, messages, bookings"],
  ["brand", "Build the brand"],
];

export function CreativePlan() {
  const [brand, setBrand] = useState("");
  const [goal, setGoal] = useState<PlanGoal>("sales");
  const [budget, setBudget] = useState(3000);
  const [cpa, setCpa] = useState(20);
  const [personas, setPersonas] = useState("Busy mums, Students, Gift buyers");
  const plan = useMemo(
    () => creativePlan({ goal, budget, targetCpa: cpa, personas: personas.split(",") }),
    [goal, budget, cpa, personas],
  );
  const mix = campaignMix(goal as Goal, plan.concepts);
  const act = usePageActions();
  const navigate = useNavigate();
  const members = useMembers();
  const clients = useClients();
  const me = members.data?.find((m) => m.userId)?.name ?? "";

  async function save() {
    const blocks: Block[] = [
      block("field", PLAN_GOALS.find(([g]) => g === goal)?.[1] ?? goal, { label: "Goal" }),
      block("field", `${budget} DT / month`, { label: "Ad budget" }),
      block("field", `${cpa} DT`, { label: "Target cost per result" }),
      block("h2", `${plan.concepts} concepts this month`),
      block("table", "", {
        rows: [
          ["#", "Angle", "Buyer", "Format", "Hook", "Who's on camera", "Where"],
          ...plan.matrix.map((c) => [
            String(c.n),
            c.angle,
            c.persona,
            c.format,
            c.hook,
            c.creator,
            c.setting,
          ]),
        ],
      }),
      block("h2", "How we run it"),
      ...plan.rules.map((r) => block("bullet", r)),
      block("callout", RULE_OF_THUMB),
    ];
    try {
      const client = clients.data?.find((c) => c.brand === brand);
      const id = await act.create.mutateAsync({
        title: `${brand || "Campaign"} · creative plan`,
        icon: "grid",
        kind: "doc",
        template: "content-plan",
        blocks,
        authorName: me,
        clientId: client?.id ?? null,
      });
      toast({ text: "Plan saved as a document", celebrate: true });
      navigate(`/pages/${id}`);
    } catch (e) {
      toast({ text: friendlyError(e), tone: "error" });
    }
  }

  return (
    <div className="gt">
      <p className="gt-lede">
        Meta&rsquo;s ad system now picks <strong>who sees an ad from the ad itself</strong>. It
        rewards ideas that are truly different, and groups look-alike ads as one. This plans a month
        of distinct concepts your budget can actually test.
      </p>
      <div className="gt-form">
        <label className="field">
          <span>For</span>
          <input
            list="gt-clients"
            value={brand}
            placeholder="Client or Gecko"
            onChange={(e) => setBrand(e.target.value)}
          />
          <datalist id="gt-clients">
            <option value="Gecko" />
            {(clients.data ?? []).map((c) => (
              <option key={c.id} value={c.brand} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Goal</span>
          <select value={goal} onChange={(e) => setGoal(e.target.value as PlanGoal)}>
            {PLAN_GOALS.map(([g, l]) => (
              <option key={g} value={g}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <Num label="Ad budget a month" value={budget} onChange={setBudget} suffix="DT" step={100} />
        <Num label="Target cost per result" value={cpa} onChange={setCpa} suffix="DT" />
        <label className="field gt-wide">
          <span>Buyers (comma between)</span>
          <input value={personas} onChange={(e) => setPersonas(e.target.value)} />
        </label>
      </div>

      <div className="gt-stats">
        <Stat
          k="Concepts this month"
          v={String(plan.concepts)}
          sub="distinct ideas, not variations"
          tone="ink"
        />
        <Stat k="Live at once" v={String(plan.liveAtOnce)} sub="in one broad ad set" />
        <Stat k="Spend before judging" v={dt(plan.testSpend)} sub="per new ad" />
        <Stat
          k="New batch every"
          v={`${plan.refreshDays} days`}
          sub={`${Math.round(plan.testShare * 100)}% of budget on tests`}
        />
      </div>

      <section className="gt-block">
        <div className="gt-block-head">
          <h2>The concepts</h2>
          <p className="small">Each row is a different angle, buyer, format and first second.</p>
        </div>
        <div className="gt-table-wrap">
          <table className="gt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Angle</th>
                <th>Buyer</th>
                <th>Format</th>
                <th>Hook</th>
                <th>On camera</th>
                <th>Where</th>
              </tr>
            </thead>
            <tbody>
              {plan.matrix.map((c) => (
                <tr key={c.n}>
                  <td className="gt-n">{c.n}</td>
                  <td>
                    <strong>{c.angle}</strong>
                    <small>{c.angleLine}</small>
                  </td>
                  <td>{c.persona}</td>
                  <td>{c.format}</td>
                  <td>
                    <span className="gt-chip">{c.hook}</span>
                  </td>
                  <td>{c.creator}</td>
                  <td>{c.setting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="gt-two">
        <section className="gt-block">
          <h2>How to run it</h2>
          <ol className="gt-rules">
            {plan.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
        <section className="gt-block">
          <h2>Funnel split</h2>
          <ul className="gt-funnel">
            {mix.map((m) => (
              <li key={m.stage}>
                <span>{STAGE_LABEL[m.stage]}</span>
                <span className="gt-bar">
                  <i style={{ width: `${(m.count / Math.max(1, plan.concepts)) * 100}%` }} />
                </span>
                <strong>{m.count}</strong>
              </li>
            ))}
          </ul>
          <p className="gt-note">{RULE_OF_THUMB}</p>
        </section>
      </div>
      <div className="gt-actions">
        <Button onClick={() => void save()} disabled={act.create.isPending}>
          Save as a document
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Ad doctor */

const EMPTY: AdRow = {
  name: "",
  spend: 0,
  impressions: 0,
  plays: 0,
  thruplays: 0,
  clicks: 0,
  results: 0,
  revenue: 0,
};
const FIELDS: [keyof AdRow, string][] = [
  ["spend", "Spend (DT)"],
  ["impressions", "Impressions"],
  ["plays", "3-s plays"],
  ["thruplays", "ThruPlays"],
  ["clicks", "Link clicks"],
  ["results", "Results"],
  ["revenue", "Revenue (DT)"],
];

function G({ v, g }: { v: string; g: Grade }) {
  return <span className={`gt-g gt-g-${g ?? "na"}`}>{v}</span>;
}

export function AdDoctor() {
  const [target, setTarget] = useState(25);
  const [rows, setRows] = useState<AdRow[]>([
    { ...EMPTY, name: "Ad A" },
    { ...EMPTY, name: "Ad B" },
    { ...EMPTY, name: "Ad C" },
  ]);
  const set = (i: number, k: keyof AdRow, v: string) =>
    setRows((rs) =>
      rs.map((r, j) => (j === i ? { ...r, [k]: k === "name" ? v : Number(v) || 0 } : r)),
    );
  const filled = rows.map((r) => (r.impressions > 0 ? diagnose(r, target) : null));

  return (
    <div className="gt">
      <p className="gt-lede">
        Paste each ad&rsquo;s numbers from Ads Manager. It reads where people drop:{" "}
        <strong>the first second</strong> (hook rate), <strong>the middle</strong> (hold rate),{" "}
        <strong>the offer</strong> (click rate) or <strong>after the click</strong>, and says what
        to do next.
      </p>
      <div className="gt-form">
        <Num label="Target cost per result" value={target} onChange={setTarget} suffix="DT" />
      </div>
      <div className="gt-table-wrap">
        <table className="gt-table gt-doctor">
          <thead>
            <tr>
              <th>Ad</th>
              {FIELDS.map(([, l]) => (
                <th key={l}>{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={r.name}
                    onChange={(e) => set(i, "name", e.target.value)}
                    aria-label="Ad name"
                  />
                </td>
                {FIELDS.map(([k, l]) => (
                  <td key={k}>
                    <input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={r[k] || ""}
                      placeholder="0"
                      aria-label={`${r.name} ${l}`}
                      onChange={(e) => set(i, k, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="gt-row-acts">
        <button
          type="button"
          onClick={() =>
            setRows((rs) => [
              ...rs,
              { ...EMPTY, name: `Ad ${String.fromCharCode(65 + rs.length)}` },
            ])
          }
          disabled={rows.length >= 10}
        >
          + Ad
        </button>
        <button
          type="button"
          onClick={() => setRows((rs) => rs.slice(0, -1))}
          disabled={rows.length <= 1}
        >
          Remove last
        </button>
      </div>

      <div className="gt-cards">
        {rows.map((r, i) => {
          const d = filled[i];
          if (!d) return null;
          return (
            <article key={i} className={`gt-ad gt-v-${d.verdict}`}>
              <header>
                <strong>{r.name || `Ad ${i + 1}`}</strong>
                <span className="gt-verdict">{VERDICT_LABEL[d.verdict]}</span>
              </header>
              <dl>
                <div>
                  <dt>Hook rate</dt>
                  <dd>
                    <G v={pct(d.hookRate)} g={d.grades.hook} />
                  </dd>
                </div>
                <div>
                  <dt>Hold rate</dt>
                  <dd>
                    <G v={pct(d.holdRate)} g={d.grades.hold} />
                  </dd>
                </div>
                <div>
                  <dt>Click rate</dt>
                  <dd>
                    <G v={pct(d.ctr, 2)} g={d.grades.ctr} />
                  </dd>
                </div>
                <div>
                  <dt>CPM</dt>
                  <dd>{dt(d.cpm, 1)}</dd>
                </div>
                <div>
                  <dt>Cost per click</dt>
                  <dd>{dt(d.cpc, 2)}</dd>
                </div>
                <div>
                  <dt>Click → result</dt>
                  <dd>{pct(d.cvr)}</dd>
                </div>
                <div>
                  <dt>Cost per result</dt>
                  <dd>
                    <strong>{dt(d.cpa, 1)}</strong>
                  </dd>
                </div>
                <div>
                  <dt>ROAS</dt>
                  <dd>{d.roas === null ? "–" : `${d.roas.toFixed(2)}×`}</dd>
                </div>
              </dl>
              <p className="gt-why">{d.why}</p>
            </article>
          );
        })}
      </div>
      <p className="gt-note">
        Good is about: hook rate {pct(BENCH.hook[1], 0)}+, hold rate {pct(BENCH.hold[1], 0)}+, click
        rate {pct(BENCH.ctr[1], 1)}+ for video ads. {RULE_OF_THUMB}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Profit and budget */

export function Profit() {
  const [e, setE] = useState<Economics>({
    price: 89,
    productCost: 30,
    delivery: 8,
    packaging: 2,
    returnRate: 0.2,
    returnCost: 7,
    fees: 0,
    margin: 0.15,
    orders: 150,
  });
  const o = economics(e);
  const set = (k: keyof Economics) => (n: number) => setE((x) => ({ ...x, [k]: n }));
  const setPct = (k: keyof Economics) => (n: number) => setE((x) => ({ ...x, [k]: n / 100 }));
  return (
    <div className="gt">
      <p className="gt-lede">
        What a client can pay for an order before ads lose money, with{" "}
        <strong>cash on delivery</strong> counted in: parcels that get refused still cost delivery
        and the trip back.
      </p>
      <div className="gt-form gt-form-4">
        <Num label="Selling price" value={e.price} onChange={set("price")} suffix="DT" />
        <Num label="Product cost" value={e.productCost} onChange={set("productCost")} suffix="DT" />
        <Num
          label="Delivery per parcel"
          value={e.delivery}
          onChange={set("delivery")}
          suffix="DT"
        />
        <Num label="Packaging" value={e.packaging} onChange={set("packaging")} suffix="DT" />
        <Num
          label="Refused or returned"
          value={Math.round(e.returnRate * 100)}
          onChange={setPct("returnRate")}
          suffix="%"
        />
        <Num
          label="Return trip cost"
          value={e.returnCost}
          onChange={set("returnCost")}
          suffix="DT"
        />
        <Num
          label="Payment fees"
          value={Math.round(e.fees * 1000) / 10}
          onChange={setPct("fees")}
          suffix="%"
          step={0.5}
        />
        <Num
          label="Profit to keep"
          value={Math.round(e.margin * 100)}
          onChange={setPct("margin")}
          suffix="% of sales"
        />
      </div>
      <div className="gt-stats">
        <Stat k="Profit per order, before ads" v={dt(o.profitPerOrder, 1)} />
        <Stat
          k="Break-even cost per order"
          v={dt(o.breakEvenCpa, 1)}
          sub={o.breakEvenRoas ? `ROAS ${o.breakEvenRoas}×` : "Not profitable even without ads"}
          tone="pink"
        />
        <Stat
          k="Target cost per order"
          v={dt(o.targetCpa, 1)}
          sub={
            o.targetRoas
              ? `ROAS ${o.targetRoas}× to keep ${Math.round(e.margin * 100)}%`
              : "Lower costs or raise the price"
          }
          tone="ink"
        />
      </div>
      <section className="gt-block">
        <h2>Budget for a goal</h2>
        <div className="gt-form">
          <Num label="Orders wanted a month" value={e.orders} onChange={set("orders")} />
        </div>
        <p className="gt-big">
          About <strong>{dt(o.budget)}</strong> a month of ads, at {dt(o.targetCpa, 1)} an order.
        </p>
        <p className="gt-note">
          Use the target cost per order as the &ldquo;target cost per result&rdquo; in the Creative
          plan and the Ad doctor.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Reel score */

export function ReelScore() {
  const [surface, setSurface] = useState<Surface>("reels");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const r = reelScore(checked, surface);
  const toggle = (k: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  return (
    <div className="gt">
      <p className="gt-lede">
        Tick what the cut does. Each item is weighted by what the platform ranks on: on Instagram,{" "}
        <strong>watch time, likes per reach and DM sends</strong>; on TikTok,{" "}
        <strong>watch time, completion and re-watches</strong>, plus search.
      </p>
      <div className="gt-seg" role="tablist">
        {(Object.keys(SURFACE_LABEL) as Surface[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={surface === s}
            onClick={() => setSurface(s)}
          >
            {SURFACE_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="gt-score-wrap">
        <ul className="gt-checks">
          {r.items.map((c) => (
            <li key={c.key}>
              <label>
                <input
                  type="checkbox"
                  checked={checked.has(c.key)}
                  onChange={() => toggle(c.key)}
                />
                <span>
                  <strong>{c.label}</strong>
                  <small>
                    {c.signal} · weight {c.weight[surface]}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <aside className={`gt-score is-${r.level}`}>
          <span className="gt-score-n">{r.score}</span>
          <span className="gt-score-l">
            {r.level === "ready"
              ? "Ready to post"
              : r.level === "almost"
                ? "Almost there"
                : "Rework the cut"}
          </span>
          {r.missing.length > 0 && (
            <>
              <p className="gt-score-k">Fix first</p>
              <ol>
                {r.missing.slice(0, 3).map((c) => (
                  <li key={c.key}>{c.fix}</li>
                ))}
              </ol>
            </>
          )}
          <button type="button" className="gt-link" onClick={() => setChecked(new Set())}>
            Start again
          </button>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Safe zones */

export function SafeZones() {
  const [zone, setZone] = useState(SAFE_ZONES[0]!.key);
  const [frame, setFrame] = useState<string | null>(null);
  const z = SAFE_ZONES.find((x) => x.key === zone)!;
  useEffect(() => () => void (frame && URL.revokeObjectURL(frame)), [frame]);
  const take = (f?: File) => f && setFrame(URL.createObjectURL(f));
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const got = imageFrom(e.clipboardData);
      if (got?.file) {
        e.preventDefault();
        setFrame(URL.createObjectURL(got.file));
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
  const px = (share: number, side: number) => Math.round(share * side);
  return (
    <div className="gt">
      <p className="gt-lede">
        Drop or paste a frame of your video (it stays on this computer) to see what the app&rsquo;s
        buttons and captions will cover. Keep text, faces and the product inside the clear area.
      </p>
      <div className="gt-seg" role="tablist">
        {SAFE_ZONES.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={zone === s.key}
            onClick={() => setZone(s.key)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="gt-safe">
        <label
          className="gt-phone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            take(imageFrom(e.dataTransfer)?.file);
          }}
        >
          <input type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />
          {frame ? (
            <img src={frame} alt="Your frame" />
          ) : (
            <span className="gt-phone-hint">Drop, paste or click to add a frame</span>
          )}
          <i className="gt-z gt-z-top" style={{ height: `${z.top * 100}%` }} />
          <i className="gt-z gt-z-bottom" style={{ height: `${z.bottom * 100}%` }} />
          <i
            className="gt-z gt-z-left"
            style={{
              width: `${z.left * 100}%`,
              top: `${z.top * 100}%`,
              bottom: `${z.bottom * 100}%`,
            }}
          />
          <i
            className="gt-z gt-z-right"
            style={{
              width: `${z.right * 100}%`,
              top: `${z.top * 100}%`,
              bottom: `${z.bottom * 100}%`,
            }}
          />
          <i
            className="gt-clear"
            style={{
              top: `${z.top * 100}%`,
              bottom: `${z.bottom * 100}%`,
              left: `${z.left * 100}%`,
              right: `${z.right * 100}%`,
            }}
          />
        </label>
        <div className="gt-safe-side">
          <h2>{z.name}</h2>
          <dl className="gt-dl">
            <div>
              <dt>Top</dt>
              <dd>
                {Math.round(z.top * 100)}% · {px(z.top, 1920)} px
              </dd>
            </div>
            <div>
              <dt>Bottom</dt>
              <dd>
                {Math.round(z.bottom * 100)}% · {px(z.bottom, 1920)} px
              </dd>
            </div>
            <div>
              <dt>Left</dt>
              <dd>
                {Math.round(z.left * 100)}% · {px(z.left, 1080)} px
              </dd>
            </div>
            <div>
              <dt>Right</dt>
              <dd>
                {Math.round(z.right * 100)}% · {px(z.right, 1080)} px
              </dd>
            </div>
          </dl>
          <p className="small">On a 1080 × 1920 frame. Source: {z.source}.</p>
          <ul className="gt-rules">
            <li>Shoot and export 9:16 at 1080 × 1920; cut 4:5 for feed from the same master.</li>
            <li>Captions and hook text in the middle band, not the bottom third.</li>
            <li>Ads with a disclaimer: keep the bottom 40% clear.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Hook lab */

export function HookLab() {
  const [h, setH] = useState({ product: "", audience: "", pain: "", result: "", objection: "" });
  const list = hookLab(h);
  const field = (k: keyof typeof h, label: string, ph: string) => (
    <label className="field">
      <span>{label}</span>
      <input value={h[k]} placeholder={ph} onChange={(e) => setH({ ...h, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="gt">
      <p className="gt-lede">
        Five words about the product, thirteen hooks of different types, each with what the{" "}
        <strong>first frame</strong> shows. Different first frames are what make ads count as
        different for Meta. Write them in Derja when it fits the brand.
      </p>
      <div className="gt-form gt-form-5">
        {field("product", "Product", "Dany Clean")}
        {field("audience", "Who it's for", "busy mums")}
        {field("pain", "The problem", "the bathroom never stays clean")}
        {field("result", "The result", "a clean bathroom in 5 minutes")}
        {field("objection", "The doubt", "too expensive")}
      </div>
      <ul className="gt-hooks">
        {list.map((x) => (
          <li key={x.type}>
            <span className="gt-chip">{x.type}</span>
            <p dir="auto">{x.line}</p>
            <small>First frame: {x.first}</small>
            <button
              type="button"
              className="gt-link"
              onClick={() =>
                void navigator.clipboard
                  .writeText(x.line)
                  .then(() => toast({ text: "Hook copied" }))
                  .catch(() => toast({ text: "Couldn't copy", tone: "error" }))
              }
            >
              Copy
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
