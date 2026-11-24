// The creative kit inside the writing space (Heni, 24 Nov 2026: "more trendy formats, more creative options").
// Formats that work with their structure, hooks filled with the brand's name, angles to try, and one tap to put
// a hook or a beat into the script.
import { useState } from "react";
import { useHookBank } from "@/features/tools/HookBank";
import {
  BANK,
  FAMILY_LABEL,
  filterBank,
  SIGNAL_LABEL,
  type Family,
} from "@/features/creative/bank";

const ANGLES = [
  "Say the opposite of what everyone in the category says.",
  "Start with the result, then rewind.",
  "Show the mistake most people make.",
  "Make it a challenge: can you spot the difference?",
  "Use a real customer's words (review, DM) as the first line.",
  "Turn the price into a comparison: less than a coffee a day.",
  "A POV the viewer has lived this week.",
  "A list: 3 things nobody tells you about…",
  "Put the product in an unexpected place.",
  "Ask a question people answer in their head.",
];

const HOOK_PATTERNS = [
  "Stop scrolling if you [pain].",
  "Nobody talks about this, but [truth].",
  "I tried [brand] for 7 days, here's what happened.",
  "The [thing] mistake 90% of people make.",
  "This is your sign to [action].",
  "POV: you finally found [brand].",
  "Wait until you see the end.",
  "Things I wish I knew before [moment].",
  "If you have [problem], watch this.",
  "[Price] DT and it changed my [routine].",
];

export function CreativeKit({
  brand,
  onHook,
  onBeat,
  onBeats,
}: {
  brand: string;
  onHook: (line: string) => void;
  onBeat: (line: string) => void;
  /** Puts a whole format's beats in the body at once. */
  onBeats?: (lines: string[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(BANK[0]?.key ?? null);
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<Family | "">("");
  const list = filterBank({ q, family });
  const bank = useHookBank();
  const winners = (bank.data ?? []).filter((h) => h.picked).slice(0, 8);
  const fill = (s: string) => s.replace(/\[brand\]/gi, brand || "the brand");
  return (
    <div className="kit">
      {winners.length > 0 && (
        <section className="kit-block">
          <h3>From your hook bank</h3>
          <p className="small muted">
            Hooks clients picked before. Tap to reuse one as a starting point.
          </p>
          <div className="kit-chips">
            {winners.map((h) => (
              <button
                key={h.key}
                type="button"
                className="kit-chip is-win"
                onClick={() => onHook(h.line)}
              >
                {h.line}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="kit-block">
        <h3>Hooks to start from</h3>
        <p className="small muted">Tap one to add it as a hook option; fill the [brackets].</p>
        <div className="kit-chips">
          {HOOK_PATTERNS.map((h) => (
            <button key={h} type="button" className="kit-chip" onClick={() => onHook(fill(h))}>
              {fill(h)}
            </button>
          ))}
        </div>
      </section>
      <section className="kit-block">
        <h3>Formats that work</h3>
        <p className="small muted">
          {BANK.length} formats from the bank. Lay out a whole format as the body, or take one beat
          at a time.
        </p>
        <div className="kit-filter">
          <input value={q} placeholder="Search formats…" onChange={(e) => setQ(e.target.value)} />
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value as Family | "")}
            aria-label="Family"
          >
            <option value="">All families</option>
            {(Object.keys(FAMILY_LABEL) as Family[]).map((k) => (
              <option key={k} value={k}>
                {FAMILY_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="kit-formats">
          {list.map((f) => (
            <article key={f.key} className={`kit-format${open === f.key ? " is-open" : ""}`}>
              <button
                type="button"
                className="kit-format-head"
                aria-expanded={open === f.key}
                onClick={() => setOpen(open === f.key ? null : f.key)}
              >
                <strong>{f.name}</strong>
                <span className="small">
                  {f.length} · {f.signals.map((x) => SIGNAL_LABEL[x]).join(", ")}
                </span>
              </button>
              {open === f.key && (
                <div className="kit-format-body">
                  <p className="small">
                    {f.line} {f.why}
                  </p>
                  <ol className="small">
                    {f.beats.map((b) => (
                      <li key={b.at}>
                        <b>{b.at}</b> {b.what}{" "}
                        <button type="button" className="kit-add" onClick={() => onBeat(b.what)}>
                          + beat
                        </button>
                      </li>
                    ))}
                  </ol>
                  {onBeats && (
                    <button
                      type="button"
                      className="kit-lay"
                      onClick={() => onBeats(f.beats.map((b) => `${b.at}: ${b.what}`))}
                    >
                      Lay out all {f.beats.length} beats
                    </button>
                  )}
                  <div className="kit-chips">
                    {f.hooks.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className="kit-chip"
                        onClick={() => onHook(fill(h))}
                      >
                        {fill(h)}
                      </button>
                    ))}
                  </div>
                  <p className="small kit-tips">
                    Needs: {f.needs.people} · {f.needs.place}
                    {f.needs.props ? ` · ${f.needs.props}` : ""}
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="kit-block">
        <h3>Angles to try</h3>
        <ul className="kit-angles">
          {ANGLES.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
