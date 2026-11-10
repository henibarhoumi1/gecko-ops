import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { whatsappTo } from "@/features/shoot/model";
import type { Member } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { usePatchLeads, type LeadPatch } from "./leadsApi";
import { LeadToClient } from "./LeadToClient";
import { ProposalPanel } from "./ProposalPanel";
import { CHANNELS, OUTCOMES, STAGE_LABEL, STEPS, stepOf, type Lead, type Stage } from "./model";
import {
  afterSend,
  CHANNEL_LABEL,
  CHANNELS_OUT,
  claudeBrief,
  compose,
  LANG_LABEL,
  LANGS,
  MOMENT_LABEL,
  MOMENTS,
  noticed,
  suggestedMoment,
  touches,
  type Channel,
  type Lang,
  type Moment,
} from "./outreach";

const STAGE_OPTIONS = [...STEPS, ...OUTCOMES];
const LANG_KEY = "gecko.pipeline.lang";

function savedLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "tn" || v === "fr" || v === "en") return v;
  } catch {
    // storage blocked
  }
  return "fr";
}

function rememberLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // not remembered
  }
}

function formatWhen(at: string): string {
  const d = new Date(at.length === 10 ? `${at}T12:00:00` : at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** One lead, without leaving the list: who they are, what's next, and the message to send now. */
export function LeadPanel({
  lead,
  members,
  me,
  onClose,
  onEditAll,
}: {
  lead: Lead;
  members: Member[];
  me: string | null;
  onClose: () => void;
  onEditAll: () => void;
}) {
  const patch = usePatchLeads();
  const [moment, setMoment] = useState<Moment>(() => suggestedMoment(lead));
  const [lang, setLang] = useState<Lang>(savedLang);
  const [channel, setChannel] = useState<Channel>(() =>
    lead.whatsapp || lead.phone ? "whatsapp" : "dm",
  );
  const [text, setText] = useState(() => compose(lead, suggestedMoment(lead), savedLang()));
  const [note, setNote] = useState(() => noticed(lead));
  const [copied, setCopied] = useState<"" | "message" | "brief">("");
  const [sentAt, setSentAt] = useState<string | null>(null);

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rewrite = (m: Moment, l: Lang, n = note) =>
    setText(compose({ ...lead, extra: { ...lead.extra, noticed: n } }, m, l));

  const save = (p: LeadPatch) => patch.mutate([{ id: lead.id, patch: p }]);

  const copy = (value: string, what: "message" | "brief") =>
    void navigator.clipboard?.writeText(value).then(
      () => setCopied(what),
      () => setCopied(""),
    );

  const markSent = () => {
    const now = new Date().toISOString();
    save(afterSend(lead, moment, channel, text, now, me));
    setSentAt(now);
  };

  const wa = whatsappTo(lead.whatsapp || lead.phone);
  const waHref = `${wa ?? "https://wa.me/"}?text=${encodeURIComponent(text)}`;
  const past = touches(lead);
  const stage = stepOf(lead.stage);

  return (
    <aside className="lead-panel" aria-label={lead.brand}>
      <header className="lead-panel-head">
        <div>
          <h2 dir="auto">{lead.brand}</h2>
          <p className="small lead-links">
            {lead.handle && <span>{lead.handle}</span>}
            {lead.url && (
              <a href={lead.url} target="_blank" rel="noreferrer noopener">
                Open profile
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer noopener">
                WhatsApp
              </a>
            )}
            {lead.channel && <span>{CHANNELS[lead.channel] ?? lead.channel}</span>}
          </p>
        </div>
        <Button variant="secondary" className="btn-small" onClick={onClose}>
          Close
        </Button>
      </header>

      <LeadToClient lead={lead} />
      <ProposalPanel lead={lead} />

      <div className="lead-panel-grid">
        <label>
          <span className="small">Stage</span>
          <select
            value={STAGE_OPTIONS.includes(stage) ? stage : "prospect"}
            onChange={(e) => {
              const next = e.target.value as Stage;
              save({
                stage: next,
                history: [
                  ...lead.history,
                  { at: new Date().toISOString().slice(0, 10), stage: next },
                ],
              });
            }}
          >
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="small">Owner</span>
          <select
            value={lead.owner_member_id ?? ""}
            onChange={(e) => save({ owner_member_id: e.target.value || null })}
          >
            <option value="">Nobody</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="lead-span">
          <span className="small">Next step</span>
          <input
            key={`step-${lead.next_step}`}
            defaultValue={lead.next_step ?? ""}
            maxLength={500}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== lead.next_step) save({ next_step: v });
            }}
          />
        </label>
        <label>
          <span className="small">Next date</span>
          <input
            type="date"
            value={lead.next_date ?? ""}
            onChange={(e) => save({ next_date: e.target.value || null })}
          />
        </label>
        <label>
          <span className="small">Contact name</span>
          <input
            key={`contact-${lead.contact}`}
            defaultValue={lead.contact ?? ""}
            maxLength={160}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== lead.contact) save({ contact: v });
            }}
          />
        </label>
        <label className="lead-span">
          <span className="small">What you noticed (opens the first message)</span>
          <textarea
            value={note}
            rows={2}
            maxLength={500}
            placeholder="Their Ramadan box sold out; the reels are all photos; a new shop in La Marsa…"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note.trim() !== noticed(lead).trim()) {
                save({ extra: { ...lead.extra, noticed: note.trim() } });
                if (moment === "first") rewrite(moment, lang, note);
              }
            }}
          />
        </label>
      </div>

      <section className="lead-compose">
        <h3>Write the message</h3>
        <div className="chips" role="group" aria-label="Moment">
          {MOMENTS.map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              aria-pressed={moment === m}
              onClick={() => {
                setMoment(m);
                rewrite(m, lang);
                setSentAt(null);
              }}
            >
              {MOMENT_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Language and channel">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className="chip"
              aria-pressed={lang === l}
              onClick={() => {
                setLang(l);
                rememberLang(l);
                rewrite(moment, l);
              }}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
          <span className="chips-gap" />
          {CHANNELS_OUT.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={channel === c}
              onClick={() => setChannel(c)}
            >
              {CHANNEL_LABEL[c]}
            </button>
          ))}
        </div>
        <textarea
          className="lead-message"
          value={text}
          rows={6}
          dir="auto"
          aria-label="Message"
          onChange={(e) => setText(e.target.value)}
        />
        <div className="lead-send">
          {channel === "whatsapp" ? (
            <a className="btn btn-primary" href={waHref} target="_blank" rel="noreferrer noopener">
              Open in WhatsApp
            </a>
          ) : (
            <Button onClick={() => copy(text, "message")}>
              {copied === "message"
                ? "Copied"
                : channel === "dm"
                  ? "Copy for Instagram"
                  : "Copy for email"}
            </Button>
          )}
          {channel === "dm" && lead.url && (
            <a
              className="btn btn-secondary"
              href={lead.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open their profile
            </a>
          )}
          <Button variant="secondary" onClick={markSent} disabled={patch.isPending || !text.trim()}>
            {sentAt ? "Logged" : "I sent it"}
          </Button>
          <Button
            variant="link"
            onClick={() => copy(claudeBrief(lead, moment, lang, channel), "brief")}
          >
            {copied === "brief" ? "Brief copied: paste it into Claude" : "Copy brief for Claude"}
          </Button>
        </div>
        <p className="small">
          &ldquo;I sent it&rdquo; logs the message, moves the stage on and sets the next follow-up,
          so no lead goes quiet.
        </p>
        {patch.isError && <Notice tone="error">{friendlyError(patch.error)}</Notice>}
      </section>

      <section className="lead-history">
        <h3>
          History <span className="count">{past.length}</span>
        </h3>
        {past.length === 0 ? (
          <p className="small">Nothing sent yet.</p>
        ) : (
          <ul>
            {past.map((t, i) => (
              <li key={`${t.at}-${i}`}>
                <span className="small">
                  {formatWhen(t.at)}
                  {t.moment && ` · ${MOMENT_LABEL[t.moment]}`}
                  {t.channel && ` · ${CHANNEL_LABEL[t.channel as Channel] ?? t.channel}`}
                </span>
                <span dir="auto">{t.text}</span>
              </li>
            ))}
          </ul>
        )}
        <Button variant="link" onClick={onEditAll}>
          Edit all fields
        </Button>
      </section>
    </aside>
  );
}
