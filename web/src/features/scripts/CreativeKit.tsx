// The creative kit inside the writing space (Heni, 24 Nov 2026: "more trendy formats, more creative options").
// Formats that work with their structure, hooks filled with the brand's name, angles to try, and one tap to put
// a hook or a beat into the script.
import { useState } from "react";
import { FORMATS, STAGE_LABEL } from "@/features/tools/strategy";

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
}: {
  brand: string;
  onHook: (line: string) => void;
  onBeat: (line: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(FORMATS[0]?.key ?? null);
  const fill = (s: string) => s.replace(/\[brand\]/gi, brand || "the brand");
  return (
    <div className="kit">
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
        <div className="kit-formats">
          {FORMATS.map((f) => (
            <article key={f.key} className={`kit-format${open === f.key ? " is-open" : ""}`}>
              <button
                type="button"
                className="kit-format-head"
                aria-expanded={open === f.key}
                onClick={() => setOpen(open === f.key ? null : f.key)}
              >
                <strong>{f.name}</strong>
                <span className="small">
                  {f.length} · {f.stage.map((s) => STAGE_LABEL[s]).join(", ")}
                </span>
              </button>
              {open === f.key && (
                <div className="kit-format-body">
                  <p className="small">{f.when}</p>
                  <ol className="small">
                    {f.structure.map((s) => (
                      <li key={s}>
                        {s}{" "}
                        <button type="button" className="kit-add" onClick={() => onBeat(s)}>
                          + beat
                        </button>
                      </li>
                    ))}
                  </ol>
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
                  <ul className="small kit-tips">
                    {f.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
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
