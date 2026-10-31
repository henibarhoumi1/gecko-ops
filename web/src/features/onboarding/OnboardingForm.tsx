import { useId, useMemo, useState, type CSSProperties } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import {
  answerText,
  en,
  openQuestions,
  percentFilled,
  questionLabel,
  sectionCount,
  sheetText,
  type Answers,
} from "./progress";
import { SECTIONS, type Question } from "./questions";
import { useOnboardingSheet, type SheetTarget } from "./useOnboardingSheet";

const SEND = "send";

interface Props {
  target: SheetTarget;
  brand: string;
  /** The team sees a summary and can copy the answers; the client sends the sheet to Gecko. */
  mode: "client" | "team";
}

/** The onboarding sheet, one section at a time, saved as you type. */
export function OnboardingForm({ target, brand, mode }: Props) {
  const sheet = useOnboardingSheet(target);
  const [at, setAt] = useState<string>(SECTIONS[0]!.id);
  const [notice, setNotice] = useState("");
  const pct = percentFilled(sheet.answers);
  const index = SECTIONS.findIndex((s) => s.id === at);

  function go(id: string) {
    setAt(id);
    setNotice("");
    document.querySelector(".ob")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  if (!sheet.ready && sheet.status === "loading")
    return <p className="muted">Loading the sheet…</p>;
  if (sheet.status === "error" && !Object.keys(sheet.answers).length && sheet.error)
    return <Notice tone="error">{sheet.error}</Notice>;

  return (
    <div className="ob">
      <div className="ob-top">
        <div className="meter" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="small">{pct}% filled</span>
        <span className={`small save save-${sheet.status}`} aria-live="polite">
          {sheet.status === "saving" ? "Saving…" : sheet.status === "error" ? "Not saved" : "Saved"}
        </span>
      </div>
      {sheet.status === "error" && sheet.error && <Notice tone="error">{sheet.error}</Notice>}

      <nav className="ob-rail" aria-label="Sections">
        {SECTIONS.map((s, i) => {
          const n = sectionCount(sheet.answers, s);
          return (
            <button
              key={s.id}
              type="button"
              className={`ob-step${n === s.fields.length ? " full" : ""}`}
              aria-current={at === s.id ? "step" : undefined}
              onClick={() => go(s.id)}
            >
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              {en(s.name)}
            </button>
          );
        })}
        <button
          type="button"
          className="ob-step"
          aria-current={at === SEND ? "step" : undefined}
          onClick={() => go(SEND)}
        >
          <span className="num">✓</span>
          {mode === "team" ? "Summary" : "Send"}
        </button>
      </nav>

      {at === SEND ? (
        <SendPart
          answers={sheet.answers}
          brand={brand}
          mode={mode}
          sentAt={sheet.sentAt}
          notice={notice}
          onGo={go}
          onSend={async () => {
            try {
              await sheet.send();
              setNotice("Sent. Gecko has your answers.");
            } catch {
              // The error shows above.
            }
          }}
          onCopy={async () => {
            await navigator.clipboard.writeText(sheetText(brand, sheet.answers));
            setNotice("Answers copied.");
          }}
        />
      ) : (
        <section className="ob-part" aria-labelledby={`ob-${at}`}>
          <header className="ob-head">
            <span className="num">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2 id={`ob-${at}`}>{en(SECTIONS[index]!.title)}</h2>
              <p className="muted">{en(SECTIONS[index]!.why)}</p>
            </div>
          </header>
          <div className="ob-grid">
            {SECTIONS[index]!.fields.map((q) => (
              <QuestionField key={q.id} q={q} answers={sheet.answers} set={sheet.set} />
            ))}
          </div>
          <div className="ob-foot">
            {index > 0 ? (
              <Button variant="secondary" onClick={() => go(SECTIONS[index - 1]!.id)}>
                ← {en(SECTIONS[index - 1]!.name)}
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={() => go(SECTIONS[index + 1]?.id ?? SEND)}>
              {SECTIONS[index + 1]
                ? `Next: ${en(SECTIONS[index + 1]!.name)}`
                : mode === "team"
                  ? "Summary"
                  : "Review and send"}{" "}
              →
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function SendPart({
  answers,
  brand,
  mode,
  sentAt,
  notice,
  onGo,
  onSend,
  onCopy,
}: {
  answers: Answers;
  brand: string;
  mode: "client" | "team";
  sentAt: string | null;
  notice: string;
  onGo: (id: string) => void;
  onSend: () => Promise<void>;
  onCopy: () => Promise<void>;
}) {
  const open = useMemo(() => openQuestions(answers), [answers]);
  const left = open.reduce((n, row) => n + row.missing.length, 0);
  const when = sentAt
    ? new Date(sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
    : "";
  return (
    <section className="ob-part">
      <header className="ob-head">
        <span className="num">✓</span>
        <div>
          <h2>{mode === "team" ? `${brand}: summary` : "Ready to send?"}</h2>
          <p className="muted">
            {mode === "team"
              ? when
                ? `The client sent it on ${when}.`
                : "The client hasn't sent it yet."
              : "Gaps are fine: we cover them together on a call. Press send and Gecko gets everything."}
          </p>
        </div>
      </header>
      {mode === "client" && when && <p className="tag">Sent to Gecko on {when}</p>}
      <p className="small">
        {left ? `${left} questions still open` : "Every question has an answer."}
      </p>
      {open.length > 0 && (
        <ul className="ob-gaps">
          {open.map(({ section, missing }) => (
            <li key={section.id}>
              <button type="button" onClick={() => onGo(section.id)}>
                <strong>{en(section.name)}</strong>
                <span className="muted">
                  {missing
                    .slice(0, 3)
                    .map((q) => questionLabel(q))
                    .join(", ")}
                  {missing.length > 3 ? "…" : ""}
                </span>
                <span className="small">
                  {section.fields.length - missing.length}/{section.fields.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {mode === "team" && (
        <dl className="ob-summary">
          {SECTIONS.flatMap((s) => s.fields)
            .map((q) => [q, answerText(answers, q)] as const)
            .filter(([, a]) => a)
            .map(([q, a]) => (
              <div key={q.id}>
                <dt>{questionLabel(q)}</dt>
                <dd>{a}</dd>
              </div>
            ))}
        </dl>
      )}
      <div className="ob-foot">
        <Button variant="secondary" onClick={() => onGo(SECTIONS[SECTIONS.length - 1]!.id)}>
          ← {en(SECTIONS[SECTIONS.length - 1]!.name)}
        </Button>
        {mode === "team" ? (
          <Button onClick={() => void onCopy()}>Copy answers</Button>
        ) : (
          <Button onClick={() => void onSend()}>
            {sentAt ? "Send the update" : "Send to Gecko"}
          </Button>
        )}
      </div>
      {notice && <Notice>{notice}</Notice>}
    </section>
  );
}

function QuestionField({
  q,
  answers,
  set,
}: {
  q: Question;
  answers: Answers;
  set: (key: string, value: unknown) => void;
}) {
  const id = useId();
  const label = q.label ? en(q.label) : "";
  const wide =
    q.type === "list" ||
    q.type === "assets" ||
    q.type === "long" ||
    ((q.type === "pick" || q.type === "picks") && q.opts.length > 6);
  const cls = `ob-f${q.half ? " half" : ""}${wide ? " wide" : ""}`;
  const placeholder = q.ph ? en(q.ph) : undefined;
  const str = (key: string) => (typeof answers[key] === "string" ? (answers[key] as string) : "");

  switch (q.type) {
    case "text":
      return (
        <div className={cls}>
          <label htmlFor={id}>{label}</label>
          <input
            id={id}
            type={q.input ?? "text"}
            value={str(q.id)}
            placeholder={placeholder}
            maxLength={500}
            onChange={(e) => set(q.id, e.target.value)}
          />
        </div>
      );
    case "long":
      return (
        <div className={cls}>
          <label htmlFor={id}>{label}</label>
          <textarea
            id={id}
            rows={3}
            value={str(q.id)}
            placeholder={placeholder}
            maxLength={4000}
            onChange={(e) => set(q.id, e.target.value)}
          />
        </div>
      );
    case "pick":
    case "picks": {
      const picked = answers[q.id];
      const isOn = (value: string) =>
        q.type === "pick" ? picked === value : Array.isArray(picked) && picked.includes(value);
      const toggle = (value: string) => {
        if (q.type === "pick") return set(q.id, picked === value ? null : value);
        const list = Array.isArray(picked) ? (picked as string[]) : [];
        set(q.id, list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
      };
      return (
        <fieldset className={cls}>
          <legend>{label}</legend>
          <div className="chips">
            {q.opts.map((opt) => (
              <button
                key={opt[0]}
                type="button"
                className="chip"
                aria-pressed={isOn(opt[0])}
                onClick={() => toggle(opt[0])}
              >
                {en(opt)}
              </button>
            ))}
            {q.other ? (
              <input
                className="chip-other"
                aria-label={`${label}: other`}
                placeholder="Other…"
                value={str(`${q.id}.other`)}
                maxLength={300}
                onChange={(e) => set(`${q.id}.other`, e.target.value)}
              />
            ) : null}
          </div>
        </fieldset>
      );
    }
    case "scale": {
      const value = str(q.id);
      return (
        <div className={`${cls} scale${value ? " set" : ""}`}>
          <span>{en(q.left)}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={value || "50"}
            aria-label={`${en(q.left)} or ${en(q.right)}`}
            onChange={(e) => set(q.id, e.target.value)}
          />
          <span>{en(q.right)}</span>
        </div>
      );
    }
    case "list": {
      const rows = Array.isArray(answers[q.id]) ? (answers[q.id] as Record<string, string>[]) : [];
      const update = (i: number, col: string, value: string) => {
        const next = [...rows, {}].map((row, n) => (n === i ? { ...row, [col]: value } : row));
        set(
          q.id,
          next
            .map((row) =>
              Object.fromEntries(Object.entries(row).filter(([, v]) => String(v).trim())),
            )
            .filter((row) => Object.keys(row).length),
        );
      };
      return (
        <fieldset className={cls}>
          <legend>{label}</legend>
          <div className="ob-list">
            {[...rows, {} as Record<string, string>].map((row, i) => (
              <div className="ob-row" key={i} style={{ "--cols": q.cols.length } as CSSProperties}>
                {q.cols.map((col) => (
                  <input
                    key={col[0]}
                    type={col[2] === "url" ? "url" : "text"}
                    aria-label={en(col[1])}
                    placeholder={en(col[1])}
                    value={row[col[0]] ?? ""}
                    maxLength={500}
                    onChange={(e) => update(i, col[0], e.target.value)}
                  />
                ))}
                {i < rows.length ? (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove"
                    onClick={() =>
                      set(
                        q.id,
                        rows.filter((_, n) => n !== i),
                      )
                    }
                  >
                    ×
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      );
    }
    case "assets":
      return (
        <fieldset className={cls}>
          <legend>{label}</legend>
          <div className="ob-assets">
            {q.items.map((item, n) => (
              <div className="ob-asset" key={n}>
                <span>{en(item)}</span>
                <select
                  aria-label={en(item)}
                  value={str(`${q.id}.${n}`)}
                  onChange={(e) => set(`${q.id}.${n}`, e.target.value)}
                >
                  <option value="">Choose</option>
                  <option value="have">We have it</option>
                  <option value="help">Need help</option>
                  <option value="none">Not needed</option>
                </select>
                <input
                  type="url"
                  aria-label={`${en(item)}: link`}
                  placeholder="Link"
                  value={str(`${q.id}.${n}.link`)}
                  maxLength={500}
                  onChange={(e) => set(`${q.id}.${n}.link`, e.target.value)}
                />
              </div>
            ))}
          </div>
        </fieldset>
      );
  }
}
