// Studio tools (Heni, 24 Nov 2026): the deliverable naming generator and the strategy assistant (formats, a
// campaign mix from the goal, the rules that make ads work). A plan can be saved as a page to share.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { block, type Block } from "@/features/pages/blocks";
import { usePageActions } from "@/features/pages/pagesApi";
import { useMembers } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { HookBank } from "./HookBank";
import { batch, deliverableName } from "./naming";
import {
  campaignMix,
  FORMATS,
  GOAL_LABEL,
  STAGE_LABEL,
  TIPS,
  type Format,
  type Goal,
  type Stage,
} from "./strategy";

type Tab = "strategy" | "formats" | "hooks" | "naming";

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>("strategy");
  return (
    <section className="page wide tools">
      <header className="page-head">
        <div>
          <h1>Studio tools</h1>
          <p className="lede">
            Build a campaign that works, pick the right formats, name every file the same way.
          </p>
        </div>
      </header>
      <div className="wtabs-row tools-tabs" role="tablist">
        {(
          [
            ["strategy", "Campaign builder"],
            ["formats", "Formats that work"],
            ["hooks", "Hook bank"],
            ["naming", "File names"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            className="wtab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "strategy" && <Builder />}
      {tab === "formats" && <Formats />}
      {tab === "hooks" && <HookBank />}
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

function Builder() {
  const [goal, setGoal] = useState<Goal>("launch");
  const [videos, setVideos] = useState(8);
  const [brand, setBrand] = useState("");
  const mix = campaignMix(goal, videos);
  const act = usePageActions();
  const navigate = useNavigate();
  const members = useMembers();
  const clients = useClients();
  const me = members.data?.find((m) => m.userId)?.name ?? "";

  async function save() {
    const blocks: Block[] = [
      block("field", GOAL_LABEL[goal], { label: "Goal" }),
      block("field", String(videos), { label: "Videos" }),
      ...mix.flatMap((m) => [
        block("h2", `${STAGE_LABEL[m.stage]} · ${m.count} videos`),
        ...m.formats
          .slice(0, 3)
          .map((f) => block("todo", `${f.name} (${f.length}): ${f.hooks[0] ?? ""}`)),
      ]),
      block("h2", "Rules"),
      ...TIPS.slice(0, 5).map((t) => block("bullet", `${t.title}: ${t.body}`)),
    ];
    try {
      const client = clients.data?.find((c) => c.brand === brand);
      const id = await act.create.mutateAsync({
        title: `${brand || "Campaign"} plan`,
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
    <>
      <div className="builder-form">
        <label className="field">
          <span>For</span>
          <input
            list="tools-clients"
            value={brand}
            placeholder="Client or Gecko"
            onChange={(e) => setBrand(e.target.value)}
          />
          <datalist id="tools-clients">
            <option value="Gecko" />
            {(clients.data ?? []).map((c) => (
              <option key={c.id} value={c.brand} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Goal</span>
          <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
              <option key={g} value={g}>
                {GOAL_LABEL[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Videos</span>
          <input
            type="number"
            min={1}
            max={60}
            value={videos}
            onChange={(e) => setVideos(Number(e.target.value) || 1)}
          />
        </label>
        <Button onClick={() => void save()} disabled={act.create.isPending}>
          Save as a document
        </Button>
      </div>
      <div className="mix">
        {mix.map((m) => (
          <section key={m.stage} className="mix-col">
            <div className="mix-head">
              <strong>{STAGE_LABEL[m.stage]}</strong>
              <span className="mix-count">{m.count}</span>
            </div>
            <div className="mix-bar">
              <span style={{ width: `${(m.count / Math.max(1, videos)) * 100}%` }} />
            </div>
            <ul className="mix-formats">
              {m.formats.map((f) => (
                <li key={f.key}>
                  <strong>{f.name}</strong>
                  <span className="small">
                    {f.length} · {f.hooks[0]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
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
