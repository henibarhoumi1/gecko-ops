// The Creative Lab: a brief in, a set of real concepts out, each one a proven format with beats, hooks and what the
// shoot needs, spread across the funnel. Star the good ones, edit them, then send them to a client's ideas or to
// Gecko's own content board.
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { toast } from "@/components/Toast";
import { friendlyError } from "@/lib/errors";
import { requireSupabase } from "@/lib/supabase";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { useClients, useSaveConcept } from "@/features/clients/clientsApi";
import { FAMILY_LABEL, SIGNAL_LABEL, STAGE_LABEL, type Stage } from "./bank";
import { conceptBody, EMPTY_BRIEF, generate, type Brief, type LabConcept, type Mix } from "./lab";

const GECKO = "gecko";

const FIELDS: { key: keyof Brief; label: string; hint: string; wide?: boolean }[] = [
  { key: "product", label: "Product", hint: "What we're selling, in their words" },
  { key: "audience", label: "Who buys it", hint: "Young mums in Tunis, gym men 20–30…" },
  { key: "pain", label: "The pain", hint: "What annoys them today", wide: true },
  { key: "result", label: "The result", hint: "What changes after", wide: true },
  { key: "proof", label: "Proof we can show", hint: "4.9 on 300 reviews, a lab test, a number" },
  { key: "offer", label: "Offer", hint: "-20% this week, free delivery…" },
  { key: "price", label: "Price", hint: "49 DT" },
  { key: "rival", label: "What they use instead", hint: "Bleach, the cheap one, a salon" },
];

function loadBrief(target: string): Brief {
  try {
    const raw = localStorage.getItem(`gecko.lab.${target}`);
    if (raw) return { ...EMPTY_BRIEF, ...(JSON.parse(raw) as Partial<Brief>) };
  } catch {
    /* private mode: start blank */
  }
  return { ...EMPTY_BRIEF };
}
function keepBrief(target: string, b: Brief) {
  try {
    localStorage.setItem(`gecko.lab.${target}`, JSON.stringify(b));
  } catch {
    /* nothing to keep */
  }
}

interface Edit {
  title?: string;
  hook?: string;
  starred?: boolean;
}

export function CreativeLab({ canBoard }: { canBoard: boolean }) {
  const { id: workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const clients = useClients().data ?? [];
  const [target, setTarget] = useState<string>(GECKO);
  const [brief, setBrief] = useState<Brief>(() => loadBrief(GECKO));
  const [mix, setMix] = useState<Mix>("balanced");
  const [n, setN] = useState(9);
  const [rising, setRising] = useState(false);
  const [quick, setQuick] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() % 100000));
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [sending, setSending] = useState(false);
  const saveConcept = useSaveConcept(target === GECKO ? "" : target);

  const brandName =
    target === GECKO ? "Gecko Creative" : (clients.find((c) => c.id === target)?.brand ?? "");
  const full = { ...brief, brand: brief.brand || brandName };
  const ready = Boolean(full.product.trim() || full.brand.trim());
  const set = useMemo(
    () =>
      ready
        ? generate(full, { n, seed, mix, rising, ...(quick ? { maxEffort: 1 as const } : {}) })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(full), n, seed, mix, rising, quick, ready],
  );
  const starred = set.filter((c) => edits[c.key]?.starred);

  function pick(next: string) {
    keepBrief(target, brief);
    setTarget(next);
    setBrief(loadBrief(next));
    setEdits({});
  }
  function change(k: keyof Brief, v: string) {
    const b = { ...brief, [k]: v };
    setBrief(b);
    keepBrief(target, b);
  }
  const edit = (key: string, e: Edit) => setEdits((x) => ({ ...x, [key]: { ...x[key], ...e } }));
  const final = (c: LabConcept) => ({
    title: (edits[c.key]?.title ?? c.title).slice(0, 160),
    hook: (edits[c.key]?.hook ?? c.hook).slice(0, 200),
    body: conceptBody(c),
  });

  async function send() {
    if (!starred.length) return;
    setSending(true);
    try {
      if (target === GECKO) {
        const rows = starred.map((c, i) => {
          const f = final(c);
          return {
            workspace_id: workspaceId,
            title: f.title,
            hook: f.hook,
            notes: f.body.slice(0, 4000),
            format: c.format.name.slice(0, 60),
            status: "idea",
            position: 1000 + i,
          };
        });
        const { error } = await requireSupabase().from("gecko_posts").insert(rows);
        if (error) throw error;
        void qc.invalidateQueries({ queryKey: ["gecko_posts", workspaceId] });
        toast({ text: `${rows.length} added to the Gecko board`, detail: "In Ideas" });
      } else {
        for (const c of starred) {
          const f = final(c);
          await saveConcept.mutateAsync({
            id: null,
            title: f.title,
            format: c.format.key === "carousel-story" ? "carousel" : "reel",
            body: f.body,
            refs: "",
            hook: f.hook,
          });
        }
        toast({
          text: `${starred.length} ideas added for ${brandName}`,
          detail: "Drafts in their Ideas, ready to share",
        });
      }
      setEdits((x) =>
        Object.fromEntries(Object.entries(x).map(([k, v]) => [k, { ...v, starred: false }])),
      );
    } catch (e) {
      toast({ text: friendlyError(e), tone: "error" });
    } finally {
      setSending(false);
    }
  }

  const canSend = target !== GECKO || canBoard;

  return (
    <div className="lab">
      <aside className="lab-brief">
        <label className="lab-for">
          <span>For</span>
          <select value={target} onChange={(e) => pick(e.target.value)}>
            <option value={GECKO}>Gecko Creative (our own)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand}
              </option>
            ))}
          </select>
        </label>
        <div className="lab-fields">
          {FIELDS.map((f) => (
            <label key={f.key} className={`lab-field${f.wide ? " is-wide" : ""}`}>
              <span>{f.label}</span>
              <input
                value={brief[f.key]}
                placeholder={f.hint}
                maxLength={120}
                onChange={(e) => change(f.key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="lab-knobs">
          <div className="seg-row" role="group" aria-label="Goal">
            {(["balanced", "seen", "trusted", "bought"] as Mix[]).map((m) => (
              <button key={m} type="button" aria-pressed={mix === m} onClick={() => setMix(m)}>
                {m === "balanced" ? "Whole funnel" : STAGE_LABEL[m as Stage]}
              </button>
            ))}
          </div>
          <div className="lab-row">
            <div className="seg-row" role="group" aria-label="How many">
              {[6, 9, 12].map((k) => (
                <button key={k} type="button" aria-pressed={n === k} onClick={() => setN(k)}>
                  {k}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="chip-toggle"
              aria-pressed={rising}
              onClick={() => setRising(!rising)}
            >
              Rising formats
            </button>
            <button
              type="button"
              className="chip-toggle"
              aria-pressed={quick}
              onClick={() => setQuick(!quick)}
            >
              Quick to shoot
            </button>
          </div>
        </div>
        <Button className="lab-go" disabled={!ready} onClick={() => setSeed((s) => s + 1)}>
          New set
        </Button>
        <p className="lab-note">
          Each concept is a format from the bank, filled with this brief. The more of the brief you
          fill, the sharper the hooks. Briefs are kept on this computer.
        </p>
      </aside>

      <div className="lab-out">
        {!ready ? (
          <div className="lab-empty">
            <h2>Start with the product</h2>
            <p>
              Write what we&rsquo;re selling and the pain it ends. The concepts appear here as you
              type.
            </p>
          </div>
        ) : (
          <div className="lab-grid">
            {set.map((c) => (
              <ConceptCardLab
                key={c.key}
                c={c}
                edit={edits[c.key] ?? {}}
                onEdit={(e) => edit(c.key, e)}
              />
            ))}
          </div>
        )}
        {starred.length > 0 && (
          <div className="lab-tray" role="status">
            <span>
              <b>{starred.length}</b> picked
            </span>
            {canSend ? (
              <Button disabled={sending} onClick={() => void send()}>
                {target === GECKO ? "Add to the Gecko board" : `Add to ${brandName}'s ideas`}
              </Button>
            ) : (
              <span className="small">Only the founder and sales add to the Gecko board.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConceptCardLab({
  c,
  edit,
  onEdit,
}: {
  c: LabConcept;
  edit: Edit;
  onEdit: (e: Edit) => void;
}) {
  const hook = edit.hook ?? c.hook;
  const nextHook = () => {
    const i = c.hooks.indexOf(hook);
    onEdit({ hook: c.hooks[(i + 1) % c.hooks.length] ?? hook });
  };
  return (
    <article className={`lab-card st-${c.stage}${edit.starred ? " is-starred" : ""}`}>
      <header>
        <span className="lab-stage">{STAGE_LABEL[c.stage]}</span>
        <span className="lab-fam">
          {FAMILY_LABEL[c.format.family]} · {c.format.length}
        </span>
        <button
          type="button"
          className="lab-star"
          aria-pressed={Boolean(edit.starred)}
          aria-label={edit.starred ? "Unpick" : "Pick"}
          onClick={() => onEdit({ starred: !edit.starred })}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M10 2.6l2.3 4.7 5.2.8-3.8 3.6.9 5.1L10 14.4l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" />
          </svg>
        </button>
      </header>
      <p className="lab-format">{c.format.name}</p>
      <input
        className="lab-title"
        value={edit.title ?? c.title}
        aria-label="Title"
        onChange={(e) => onEdit({ title: e.target.value })}
      />
      <div className="lab-hook">
        <textarea
          rows={2}
          value={hook}
          aria-label="Hook"
          onChange={(e) => onEdit({ hook: e.target.value })}
        />
        {c.hooks.length > 1 && (
          <button type="button" onClick={nextHook}>
            Another hook
          </button>
        )}
      </div>
      <ol className="lab-beats">
        {c.beats.map((b) => (
          <li key={b.at}>
            <b>{b.at}</b>
            <span>{b.what}</span>
          </li>
        ))}
      </ol>
      <footer>
        <span className="lab-angle">{c.angle}</span>
        <span className="lab-sig">{c.format.signals.map((s) => SIGNAL_LABEL[s]).join(" · ")}</span>
        <span className="lab-needs">
          {c.format.needs.people} · {c.format.needs.place}
        </span>
      </footer>
    </article>
  );
}
