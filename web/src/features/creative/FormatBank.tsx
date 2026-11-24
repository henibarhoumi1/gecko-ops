// The format bank, browsable: filters by family, funnel stage and ranking signal, a card per format with its beats,
// hooks and what it takes to shoot. Used in the Creative Lab, in Studio tools, in the idea composer and in the
// client's Inspiration.
import { useState } from "react";
import {
  BANK,
  FAMILY_LABEL,
  filterBank,
  SIGNAL_LABEL,
  STAGE_LABEL,
  type BankFormat,
  type Family,
  type Signal,
  type Stage,
} from "./bank";

export function FormatCard({
  f,
  onUse,
  useLabel,
  compact = false,
}: {
  f: BankFormat;
  onUse?: (f: BankFormat) => void;
  useLabel?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  return (
    <article className={`cb-card fam-${f.family}`}>
      <header className="cb-card-head">
        <span className="cb-fam">{FAMILY_LABEL[f.family]}</span>
        {f.trend === "rising" && <span className="cb-rising">Rising</span>}
        <span className="cb-len">{f.length}</span>
      </header>
      <h3>{f.name}</h3>
      <p className="cb-line">{f.line}</p>
      <p className="cb-hook">&ldquo;{f.hooks[0]}&rdquo;</p>
      <p className="cb-signals">
        {f.signals.map((s) => (
          <span key={s}>{SIGNAL_LABEL[s]}</span>
        ))}
      </p>
      {open && (
        <>
          <ol className="cb-beats">
            {f.beats.map((b) => (
              <li key={b.at}>
                <b>{b.at}</b>
                <span>{b.what}</span>
              </li>
            ))}
          </ol>
          <p className="cb-why">{f.why}</p>
          <p className="cb-needs">
            <span>{f.needs.people}</span>
            <span>{f.needs.place}</span>
            {f.needs.props && <span>{f.needs.props}</span>}
            <span className={`cb-effort e${f.effort}`} title="Effort to make">
              {["Quick to make", "Half a day", "A real shoot"][f.effort - 1]}
            </span>
          </p>
        </>
      )}
      <footer className="cb-foot">
        {compact && (
          <button type="button" className="cb-more" onClick={() => setOpen(!open)}>
            {open ? "Less" : "How it goes"}
          </button>
        )}
        {onUse && (
          <button type="button" className="cb-use" onClick={() => onUse(f)}>
            {useLabel ?? "Use this"}
          </button>
        )}
      </footer>
    </article>
  );
}

export function FormatBank({
  onUse,
  useLabel,
  compact = true,
  intro,
}: {
  onUse?: (f: BankFormat) => void;
  useLabel?: string;
  compact?: boolean;
  intro?: string;
}) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<Family | "">("");
  const [stage, setStage] = useState<Stage | "">("");
  const [signal, setSignal] = useState<Signal | "">("");
  const [rising, setRising] = useState(false);
  const list = filterBank({ q, family, stage, signal, trend: rising ? "rising" : "" }, BANK);
  return (
    <div className="cb">
      {intro && <p className="cb-intro">{intro}</p>}
      <div className="cb-filters">
        <input
          className="cb-search"
          value={q}
          placeholder="Search formats, hooks…"
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage | "")}
          aria-label="Goal"
        >
          <option value="">Any goal</option>
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={signal}
          onChange={(e) => setSignal(e.target.value as Signal | "")}
          aria-label="Signal"
        >
          <option value="">Any signal</option>
          {(Object.keys(SIGNAL_LABEL) as Signal[]).map((s) => (
            <option key={s} value={s}>
              {SIGNAL_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="cb-toggle"
          aria-pressed={rising}
          onClick={() => setRising(!rising)}
        >
          Rising now
        </button>
      </div>
      <div className="cb-fams" role="group" aria-label="Family">
        <button type="button" aria-pressed={family === ""} onClick={() => setFamily("")}>
          All <span>{BANK.length}</span>
        </button>
        {(Object.keys(FAMILY_LABEL) as Family[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={family === k}
            onClick={() => setFamily(family === k ? "" : k)}
          >
            {FAMILY_LABEL[k]} <span>{BANK.filter((f) => f.family === k).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="cb-none">No format matches. Loosen a filter.</p>
      ) : (
        <div className="cb-grid">
          {list.map((f) => (
            <FormatCard
              key={f.key}
              f={f}
              compact={compact}
              {...(onUse ? { onUse } : {})}
              {...(useLabel ? { useLabel } : {})}
            />
          ))}
        </div>
      )}
    </div>
  );
}
