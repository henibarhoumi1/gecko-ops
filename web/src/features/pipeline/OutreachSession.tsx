import { useEffect, useMemo, useState } from "react";
import { GoArrow } from "@/components/GoArrow";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import type { Member } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { usePatchLeads, type LeadPatch } from "./leadsApi";
import { LOST_REASONS, STAGE_LABEL, stepOf, type Lead } from "./model";
import {
  CHANNEL_LABEL,
  CHANNELS_OUT,
  compose,
  LANG_LABEL,
  LANGS,
  lastTouchText,
  MOMENT_LABEL,
  noticed,
  suggestedMoment,
  touches,
  type Channel,
  type Lang,
} from "./outreach";
import {
  instagramUrl,
  later,
  notAFit,
  queue,
  replied,
  score,
  sent,
  whatsappUrl,
  type Scope,
} from "./session";

const GOAL_KEY = "gecko.outreach.goal";
const LANG_KEY = "gecko.outreach.lang";
const readGoal = () => {
  try {
    const n = Number(localStorage.getItem(GOAL_KEY));
    return Number.isFinite(n) && n > 0 ? n : 20;
  } catch {
    return 20;
  }
};
const readLang = (): Lang => {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "fr" || v === "en" || v === "tn" ? v : "tn";
  } catch {
    return "tn";
  }
};

/** One lead at a time, the message ready: send it, mark the answer, and the next lead comes up. */
export function OutreachSession({
  leads,
  members,
  me,
  today,
  onClose,
  onOpenLead,
}: {
  leads: Lead[];
  members: Member[];
  me: string | null;
  today: string;
  onClose: () => void;
  onOpenLead: (id: string) => void;
}) {
  const patch = usePatchLeads();
  const [scope, setScope] = useState<Scope>("mine");
  const [goal, setGoal] = useState(readGoal);
  const [lang, setLang] = useState<Lang>(readLang);
  const [channel, setChannel] = useState<Channel>("dm");
  // The queue is fixed when the session starts, so a lead you just handled doesn't jump back in.
  const [ids, setIds] = useState<string[]>(() => queue(leads, today, me, "mine").map((l) => l.id));
  const [at, setAt] = useState(0);
  const [done, setDone] = useState(0);
  const [copied, setCopied] = useState(false);
  const [why, setWhy] = useState("");

  const byId = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const lead = ids[at] ? byId.get(ids[at]!) : undefined;
  const moment = lead ? suggestedMoment(lead) : "first";
  const [text, setText] = useState("");
  useEffect(() => {
    if (lead) setText(compose(lead, moment, lang));
    setCopied(false);
    setWhy("");
    // Only when the lead, the moment or the language changes: typing in the box must not be overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, moment, lang]);

  const s = score(leads, today, me);
  const pct = Math.min(100, Math.round((s.team / goal) * 100));
  const owner = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Nobody";

  const restart = (next: Scope) => {
    setScope(next);
    setIds(queue(leads, today, me, next).map((l) => l.id));
    setAt(0);
  };
  const advance = () => {
    setDone((n) => n + 1);
    setAt((n) => n + 1);
  };
  const apply = (p: LeadPatch) =>
    lead && patch.mutate([{ id: lead.id, patch: p }], { onSuccess: advance });

  const copy = () =>
    void navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  const ig = lead ? instagramUrl(lead.handle) : null;
  const wa = lead ? whatsappUrl(lead.whatsapp || lead.phone, text) : null;

  // Keyboard: S sent, R replied, L later, N not a fit, → skip, Esc close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("textarea, input, select");
      if (typing || e.metaKey || e.ctrlKey || e.altKey || !lead || patch.isPending) return;
      const k = e.key.toLowerCase();
      if (k === "escape") onClose();
      else if (k === "s") document.getElementById("os-sent")?.click();
      else if (k === "r") document.getElementById("os-replied")?.click();
      else if (k === "l") document.getElementById("os-later")?.click();
      else if (k === "arrowright") setAt((n) => n + 1);
      else if (k === "arrowleft") setAt((n) => Math.max(0, n - 1));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, patch.isPending, onClose]);

  return (
    <section className="os" aria-label="Outreach session">
      <header className="os-top">
        <div className="os-score">
          <div className="os-goal">
            <span className="os-k">Today</span>
            <strong>
              {s.team}
              <small> / {goal}</small>
            </strong>
            <span className="os-bar" aria-hidden="true">
              <i style={{ transform: `scaleX(${pct / 100})` }} />
            </span>
          </div>
          <div>
            <span className="os-k">You</span>
            <strong>{s.mine}</strong>
          </div>
          <div>
            <span className="os-k">Streak</span>
            <strong>
              {s.streak}
              <small> {s.streak === 1 ? "day" : "days"}</small>
            </strong>
          </div>
          <div>
            <span className="os-k">Replies, 7 days</span>
            <strong>{s.wins}</strong>
          </div>
        </div>
        <div className="os-controls">
          <div className="seg" role="group" aria-label="Whose leads">
            {(["mine", "all"] as const).map((x) => (
              <button key={x} type="button" aria-pressed={scope === x} onClick={() => restart(x)}>
                {x === "mine" ? "Mine and unowned" : "Everyone's"}
              </button>
            ))}
          </div>
          <label className="os-goal-set">
            Goal
            <input
              type="number"
              min={1}
              max={200}
              value={goal}
              onChange={(e) => {
                const n = Math.max(1, Math.min(200, Number(e.target.value) || 1));
                setGoal(n);
                try {
                  localStorage.setItem(GOAL_KEY, String(n));
                } catch {
                  /* private mode: the goal lasts for this session */
                }
              }}
            />
          </label>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </header>

      {patch.isError && <Notice tone="error">{friendlyError(patch.error)}</Notice>}

      {!lead ? (
        <div className="os-end">
          <p className="os-end-big">{done ? "Queue cleared." : "Nobody to write to right now."}</p>
          <p>
            {done
              ? `${done} ${done === 1 ? "lead" : "leads"} handled this session. ${s.team >= goal ? "Goal reached." : `${goal - s.team} more to reach today's goal.`}`
              : "Add leads with Add leads, or switch to everyone's leads."}
          </p>
          <div className="actions">
            {scope === "mine" && (
              <Button variant="secondary" onClick={() => restart("all")}>
                Everyone&rsquo;s leads
              </Button>
            )}
            <Button onClick={onClose}>Back to the pipeline</Button>
          </div>
        </div>
      ) : (
        <div className="os-body">
          <article className="os-lead" key={lead.id}>
            <p className="os-pos">
              {at + 1} of {ids.length} · {STAGE_LABEL[stepOf(lead.stage)]} ·{" "}
              {lead.next_date && lead.next_date < today ? "late" : "due"}
            </p>
            <h2 className="os-brand">{lead.brand}</h2>
            <dl className="os-facts">
              {lead.handle && (
                <div>
                  <dt>Instagram</dt>
                  <dd>
                    {ig ? (
                      <a href={ig} target="_blank" rel="noreferrer">
                        {lead.handle}
                      </a>
                    ) : (
                      lead.handle
                    )}
                  </dd>
                </div>
              )}
              {lead.contact && (
                <div>
                  <dt>Contact</dt>
                  <dd>{lead.contact}</dd>
                </div>
              )}
              {lead.sector && (
                <div>
                  <dt>Sector</dt>
                  <dd>{lead.sector}</dd>
                </div>
              )}
              <div>
                <dt>Owner</dt>
                <dd>{owner(lead.owner_member_id)}</dd>
              </div>
              <div>
                <dt>Last touch</dt>
                <dd>{lastTouchText(lead, today)}</dd>
              </div>
            </dl>
            {noticed(lead) && <p className="os-noticed">{noticed(lead)}</p>}
            {touches(lead).length > 0 && (
              <ol className="os-history">
                {touches(lead)
                  .slice(0, 3)
                  .map((t, i) => (
                    <li key={i}>
                      <span>{t.at.slice(0, 10)}</span>
                      {t.text}
                    </li>
                  ))}
              </ol>
            )}
            <Button variant="link" onClick={() => onOpenLead(lead.id)}>
              Open the full lead
            </Button>
          </article>

          <div className="os-compose">
            <div className="os-row">
              <span className="os-k">{MOMENT_LABEL[moment]}</span>
              <div className="seg" role="group" aria-label="Language">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={lang === l}
                    onClick={() => {
                      setLang(l);
                      try {
                        localStorage.setItem(LANG_KEY, l);
                      } catch {
                        /* private mode */
                      }
                    }}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
              <div className="seg" role="group" aria-label="Channel">
                {CHANNELS_OUT.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={channel === c}
                    onClick={() => setChannel(c)}
                  >
                    {CHANNEL_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="os-text"
              value={text}
              rows={7}
              onChange={(e) => setText(e.target.value)}
              aria-label="Message"
            />
            <div className="os-send">
              <Button variant="secondary" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </Button>
              {channel === "dm" && ig && (
                <a
                  className="btn btn-secondary"
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                  onClick={copy}
                >
                  Copy and open Instagram
                </a>
              )}
              {channel === "whatsapp" && wa && (
                <a className="btn btn-secondary" href={wa} target="_blank" rel="noreferrer">
                  Open WhatsApp
                </a>
              )}
            </div>

            <div className="os-answers">
              <Button
                id="os-sent"
                disabled={patch.isPending || !text.trim()}
                onClick={() =>
                  apply(sent(lead, moment, channel, text.trim(), new Date().toISOString(), me))
                }
              >
                Sent <kbd>S</kbd>
              </Button>
              <Button
                id="os-replied"
                variant="secondary"
                disabled={patch.isPending}
                onClick={() => apply(replied(lead, today, me))}
              >
                They replied <kbd>R</kbd>
              </Button>
              <Button
                id="os-later"
                variant="secondary"
                disabled={patch.isPending}
                onClick={() => apply(later(lead, today))}
              >
                Tomorrow <kbd>L</kbd>
              </Button>
              <select
                aria-label="Not a fit"
                value={why}
                disabled={patch.isPending}
                onChange={(e) => {
                  setWhy(e.target.value);
                  if (e.target.value) apply(notAFit(lead, today, e.target.value));
                }}
              >
                <option value="">Not a fit…</option>
                {Object.entries(LOST_REASONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <Button variant="link" onClick={() => setAt((n) => n + 1)}>
                Skip <GoArrow />
              </Button>
            </div>
            <p className="small">
              Sending logs the message, moves the lead on and sets the next follow-up. Keys: S sent,
              R replied, L tomorrow, → skip, Esc close.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
