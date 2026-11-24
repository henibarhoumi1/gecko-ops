// Studio tools (Heni, 24 Nov 2026): Plan (Andromeda-aligned creative plan, profit and budget), Make (hook lab,
// reel score, safe zones, formats, hook bank), Measure (ad doctor) and Studio (pricing, file names).
import { useState } from "react";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { AdDoctor, CreativePlan, HookLab, Profit, ReelScore, SafeZones } from "./GrowthTools";
import { HookBank } from "./HookBank";
import { Pricing } from "./Pricing";
import { batch, deliverableName } from "./naming";
import { FORMATS, STAGE_LABEL, TIPS, type Format, type Stage } from "./strategy";

type Tab =
  | "plan"
  | "doctor"
  | "profit"
  | "score"
  | "safe"
  | "lab"
  | "formats"
  | "hooks"
  | "pricing"
  | "naming";

const GROUPS: { name: string; tabs: [Tab, string][] }[] = [
  {
    name: "Plan",
    tabs: [
      ["plan", "Creative plan"],
      ["profit", "Profit & budget"],
    ],
  },
  {
    name: "Make",
    tabs: [
      ["lab", "Hook lab"],
      ["score", "Reel score"],
      ["safe", "Safe zones"],
      ["formats", "Formats"],
      ["hooks", "Hook bank"],
    ],
  },
  { name: "Measure", tabs: [["doctor", "Ad doctor"]] },
  {
    name: "Studio",
    tabs: [
      ["pricing", "Pricing"],
      ["naming", "File names"],
    ],
  },
];

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>(() => {
    const h = window.location.hash.slice(1) as Tab;
    return GROUPS.some((g) => g.tabs.some(([k]) => k === h)) ? h : "plan";
  });
  const go = (k: Tab) => {
    setTab(k);
    window.history.replaceState(null, "", `#${k}`);
  };
  return (
    <section className="page wide tools">
      <header className="page-head">
        <div>
          <h1>Studio tools</h1>
          <p className="lede">
            Plan creative the way the platforms rank it, read the numbers, and make every reel
            count.
          </p>
        </div>
      </header>
      <nav className="tools-nav" aria-label="Tools">
        {GROUPS.map((g) => (
          <div key={g.name} className="tools-group">
            <span className="tools-group-k">{g.name}</span>
            <div className="tools-group-tabs" role="tablist">
              {g.tabs.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => go(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      {tab === "plan" && <CreativePlan />}
      {tab === "doctor" && <AdDoctor />}
      {tab === "profit" && <Profit />}
      {tab === "score" && <ReelScore />}
      {tab === "safe" && <SafeZones />}
      {tab === "lab" && <HookLab />}
      {tab === "formats" && <Formats />}
      {tab === "hooks" && <HookBank />}
      {tab === "pricing" && <Pricing />}
      {tab === "naming" && <Naming />}
    </section>
  );
}

function FormatCard({ f }: { f: Format }) {
  return (
    <article className="fmt-card">
      <div className="fmt-head">
        <strong>{f.name}</strong>
        <span className="small">{f.length}</span>
      </div>
      <p className="small">{f.when}</p>
      <ol className="fmt-steps small">
        {f.structure.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="small">
        <strong>Hooks:</strong> {f.hooks.map((h) => `“${h}”`).join(" · ")}
      </p>
      <ul className="fmt-tips small">
        {f.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </article>
  );
}

function Formats() {
  const [stage, setStage] = useState<Stage | "all">("all");
  const list = FORMATS.filter((f) => stage === "all" || f.stage.includes(stage));
  return (
    <>
      <div className="cal-filters">
        {(["all", "awareness", "consideration", "conversion", "retention"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className="cal-filter"
            aria-pressed={stage === s}
            onClick={() => setStage(s)}
          >
            {s === "all" ? "All" : STAGE_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="fmt-grid">
        {list.map((f) => (
          <FormatCard key={f.key} f={f} />
        ))}
      </div>
      <section className="hub-block tips-block">
        <div className="hub-head">
          <h2>The rules</h2>
        </div>
        <div className="tips-grid">
          {TIPS.map((t, i) => (
            <div key={t.title} className="tip">
              <span className="tip-n">{i + 1}</span>
              <strong>{t.title}</strong>
              <span className="small">{t.body}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const FORMATS_OUT = ["9x16", "4x5", "1x1", "16x9"];

function Naming() {
  const clients = useClients();
  const [client, setClient] = useState("");
  const [campaign, setCampaign] = useState("Launch");
  const [reels, setReels] = useState(3);
  const [hooks, setHooks] = useState("A,B");
  const [formats, setFormats] = useState<string[]>(["9x16"]);
  const [version, setVersion] = useState(1);
  const [kind, setKind] = useState("MASTER");
  const [ext, setExt] = useState("mp4");
  const [dated, setDated] = useState(false);
  const base = {
    client: client || clients.data?.[0]?.brand || "Client",
    campaign,
    version,
    kind,
    date: dated ? new Date().toISOString().slice(0, 10) : "",
    ext,
  };
  const hookList = hooks
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 6);
  const names = batch(base, reels, hookList, formats.length ? formats : ["9x16"]);
  const one = deliverableName({
    ...base,
    reel: 1,
    hook: hookList[0] ?? "",
    format: formats[0] ?? "9x16",
  });

  return (
    <>
      <p className="naming-example">
        <span className="small">Every file looks like</span>
        <code>{one}</code>
      </p>
      <div className="builder-form naming-form">
        <label className="field">
          <span>Client</span>
          <select value={client} onChange={(e) => setClient(e.target.value)}>
            {(clients.data ?? []).map((c) => (
              <option key={c.id} value={c.brand}>
                {c.brand}
              </option>
            ))}
            <option value="Gecko">Gecko</option>
          </select>
        </label>
        <label className="field">
          <span>Campaign</span>
          <input value={campaign} maxLength={40} onChange={(e) => setCampaign(e.target.value)} />
        </label>
        <label className="field">
          <span>Reels</span>
          <input
            type="number"
            min={1}
            max={99}
            value={reels}
            onChange={(e) => setReels(Number(e.target.value) || 1)}
          />
        </label>
        <label className="field">
          <span>Hooks</span>
          <input value={hooks} placeholder="A,B,C" onChange={(e) => setHooks(e.target.value)} />
        </label>
        <label className="field">
          <span>Version</span>
          <input
            type="number"
            min={1}
            max={99}
            value={version}
            onChange={(e) => setVersion(Number(e.target.value) || 1)}
          />
        </label>
        <label className="field">
          <span>Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="MASTER">Master</option>
            <option value="CUT">Cutdown</option>
            <option value="SUB">Subtitled</option>
            <option value="NOSUB">No subtitles</option>
            <option value="RAW">Rushes</option>
            <option value="THUMB">Cover</option>
          </select>
        </label>
        <label className="field">
          <span>Extension</span>
          <select value={ext} onChange={(e) => setExt(e.target.value)}>
            {["mp4", "mov", "jpg", "png", "srt", "pdf"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Formats</span>
          <div className="cal-filters">
            {FORMATS_OUT.map((f) => (
              <button
                key={f}
                type="button"
                className="cal-filter"
                aria-pressed={formats.includes(f)}
                onClick={() =>
                  setFormats((list) =>
                    list.includes(f) ? list.filter((x) => x !== f) : [...list, f],
                  )
                }
              >
                {f.replace("x", ":")}
              </button>
            ))}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={dated} onChange={(e) => setDated(e.target.checked)} /> Add
          today's date
        </label>
      </div>
      <section className="today-section">
        <div className="today-section-head">
          <h2>{names.length} file names</h2>
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(names.join("\n"))
                .then(() => toast({ text: `${names.length} names copied` }))
                .catch(() => toast({ text: "Couldn't copy", tone: "error" }))
            }
          >
            Copy all
          </Button>
        </div>
        <ol className="name-list">
          {names.map((n) => (
            <li key={n}>
              <code>{n}</code>
              <button
                type="button"
                className="name-copy"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(n)
                    .then(() => toast({ text: "Copied", detail: n }))
                }
              >
                Copy
              </button>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
