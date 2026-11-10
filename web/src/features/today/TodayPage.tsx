import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useClients } from "@/features/clients/clientsApi";
import { MessageLang } from "@/features/clients/LoginsPanel";
import { nudgeMessage, whatsappLink, type MsgLang } from "@/features/clients/messages";
import { blankLead } from "@/features/pipeline/LeadDialog";
import { newLeadId, useAddLeads, useLeads } from "@/features/pipeline/leadsApi";
import { parsePaste } from "@/features/pipeline/outreach";
import { useTeamShoots } from "@/features/shoot/shootApi";
import { useMembers } from "@/features/workspace/members";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { originFor } from "@/lib/hosts";
import {
  byClient,
  daysSince,
  daysUntil,
  dueLeads,
  groupUs,
  hasCreative,
  headline,
  linkFor,
  nextShoot,
  parseCapture,
  partName,
  shortDay,
  splitDates,
  summarise,
  waited,
  weekStrip,
  when,
  whyText,
} from "./model";
import { useCaptureIdea, useToday } from "./todayApi";

/** "Wed" for 2026-11-04. */
const weekday = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

const KIND: Record<string, string> = {
  shoot: "Shoot",
  drafts: "Drafts",
  milestone: "Milestone",
  invoice: "Invoice",
  lead: "Lead",
};

/** The founder's and producers' home: the next shoot, whose move it is, the week, and who to write to. */
export function TodayPage() {
  const { id: workspaceId } = useWorkspace();
  const today = useToday();
  const shoots = useTeamShoots(workspaceId);
  const leads = useLeads();
  const [lang, setLang] = useState<MsgLang>("fr");
  const [openUs, setOpenUs] = useState<string | null>(null);
  const [openThem, setOpenThem] = useState<string | null>(null);

  if (today.isPending) return <p className="loading">Loading…</p>;
  if (today.isError)
    return (
      <section className="page wide">
        <Notice tone="error">{friendlyError(today.error)}</Notice>
      </section>
    );

  const t = today.data;
  const usGroups = groupUs(t.us);
  const themGroups = byClient(t.client);
  const shootList = shoots.data ?? [];
  const next = nextShoot(shootList, t.today);
  const week = weekStrip(t.today, t.dates, shootList);
  const { late } = splitDates(t.dates, t.today);
  const touch = dueLeads(leads.data ?? [], t.today);
  const portal = originFor("client");
  const nextDrafts = t.dates
    .filter((d) => d.kind === "drafts" && daysUntil(d.date, t.today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <section className="page wide today today-v1">
      <header className="page-head">
        <div>
          <p className="eyebrow">{shortDay(t.today)}</p>
          <h1>Today</h1>
          <p className="today-sum">{headline(t)}</p>
        </div>
      </header>

      <Capture />

      {t.problems > 0 && (
        <Notice tone="error">
          {t.problems} {t.problems === 1 ? "problem" : "problems"} in the app since you last looked.{" "}
          <Link to="/alerts">Open Alerts</Link>
        </Notice>
      )}

      {next ? (
        <Link className="today-next" to={`/shoots/${encodeURIComponent(next.clientId)}/${next.id}`}>
          <span className="eyebrow">
            {next.day === t.today ? "Shooting today" : `Next shoot · ${when(next.day, t.today)}`}
          </span>
          <strong>
            {next.brand}
            {next.title && ` · ${next.title}`}
          </strong>
          <span>
            {[
              shortDay(next.day),
              next.callTime && `call ${next.callTime}`,
              next.reels ? `${next.done} of ${next.reels} reels shot` : "no reels on it yet",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {nextDrafts && (
            <span className="small">
              First drafts for {nextDrafts.brand} due {when(nextDrafts.date, t.today).toLowerCase()}
            </span>
          )}
          <span className="today-next-go">Open Shoot Day →</span>
        </Link>
      ) : (
        <p className="today-next today-next-empty">
          No shoot day planned. Add one from a client&rsquo;s Shoot days tab.
        </p>
      )}

      <div className="today-cols">
        <section className="today-section">
          <h2>
            Your move <span className="today-count">{t.us.length}</span>
          </h2>
          {usGroups.length === 0 ? (
            <p className="empty-state">Nothing from clients is waiting on you.</p>
          ) : (
            <ul className="today-lines">
              {usGroups.map((g) => (
                <li key={g.client_id}>
                  <button
                    type="button"
                    className="today-line"
                    aria-expanded={openUs === g.client_id}
                    onClick={() => setOpenUs(openUs === g.client_id ? null : g.client_id)}
                  >
                    <strong>{g.brand}</strong>
                    <span>{summarise(g.items)}</span>
                    <span className="today-wait">{waited(daysSince(g.oldest))}</span>
                  </button>
                  {openUs === g.client_id && (
                    <ul className="today-items">
                      {g.items.map((u) => (
                        <li key={`${u.part}-${u.id}-${u.why}`}>
                          <Link to={linkFor(u)}>
                            {partName(u.part)}: {u.title}
                          </Link>
                          <span className="small">
                            {whyText(u.why)} · {waited(daysSince(u.at))}
                          </span>
                          {u.body && <q className="small">{u.body}</q>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="today-section">
          <div className="today-section-head">
            <h2>
              Their move <span className="today-count">{t.client.length}</span>
            </h2>
            {themGroups.some((g) => hasCreative(g.waiting)) && (
              <MessageLang lang={lang} onChange={setLang} />
            )}
          </div>
          {themGroups.length === 0 ? (
            <p className="empty-state">Nothing is waiting for a client&rsquo;s answer.</p>
          ) : (
            <ul className="today-lines">
              {themGroups.map((g) => (
                <li key={g.client_id}>
                  <div className="today-line-row">
                    <button
                      type="button"
                      className="today-line"
                      aria-expanded={openThem === g.client_id}
                      onClick={() => setOpenThem(openThem === g.client_id ? null : g.client_id)}
                    >
                      <strong>{g.brand}</strong>
                      <span>{summarise(g.items)}</span>
                      <span
                        className={`today-wait${daysSince(g.oldest) >= 3 ? " today-slow" : ""}`}
                      >
                        {waited(daysSince(g.oldest))}
                      </span>
                    </button>
                    {hasCreative(g.waiting) && (
                      <a
                        className="btn btn-secondary btn-small"
                        href={whatsappLink(nudgeMessage(lang, g.waiting, portal))}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Remind
                      </a>
                    )}
                  </div>
                  {openThem === g.client_id && (
                    <ul className="today-items">
                      {g.items.map((i) => (
                        <li key={`${i.part}-${i.id}`}>
                          <Link to={linkFor(i)}>
                            {partName(i.part)}: {i.title}
                          </Link>
                          <span className="small">
                            {i.part === "invoice" && i.due
                              ? `due ${when(i.due, t.today).toLowerCase()}`
                              : waited(daysSince(i.at))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="today-section">
        <h2>This week</h2>
        <ol className="today-week">
          {week.map((d) => (
            <li key={d.date} className={d.date === t.today ? "is-today" : ""}>
              <span className="today-week-day">
                <strong>{weekday(d.date)}</strong> {Number(d.date.slice(8))}
              </span>
              {d.entries.map((e, i) => (
                <Link key={i} to={e.to} className={`today-week-item kind-${e.kind}`}>
                  <span className="small">{KIND[e.kind] ?? e.kind}</span>
                  <strong>{e.brand}</strong>
                  <span className="small">{e.label}</span>
                </Link>
              ))}
            </li>
          ))}
        </ol>
        {late.length > 0 && (
          <p className="small today-slipped">
            <strong>Slipped:</strong>{" "}
            {late
              .map((d) => `${d.brand}, ${d.label} (${when(d.date, t.today).toLowerCase()})`)
              .join(" · ")}
          </p>
        )}
      </section>

      <div className="today-cols">
        <section className="today-section">
          <h2>
            Leads to write to <span className="today-count">{touch.length}</span>
          </h2>
          {touch.length === 0 ? (
            <p className="empty-state">No follow-up due today.</p>
          ) : (
            <ul className="today-lines">
              {touch.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link className="today-line" to={`/pipeline?lead=${encodeURIComponent(l.id)}`}>
                    <strong>{l.brand}</strong>
                    <span>{l.next_step || "First message"}</span>
                    <span
                      className={`today-wait${l.next_date && l.next_date < t.today ? " today-slow" : ""}`}
                    >
                      {l.next_date ? when(l.next_date, t.today) : "no date"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {touch.length > 6 && (
            <p className="small">
              <Link to="/pipeline">{touch.length - 6} more in the Pipeline</Link>
            </p>
          )}
        </section>

        <section className="today-section">
          <h2>
            New from the website <span className="today-count">{t.leads.length}</span>
          </h2>
          {t.leads.length === 0 ? (
            <p className="empty-state">No new briefs or messages in the last two weeks.</p>
          ) : (
            <ul className="today-lines">
              {t.leads.map((l) => (
                <li key={l.id}>
                  <Link className="today-line" to={`/pipeline?lead=${encodeURIComponent(l.id)}`}>
                    <strong>{l.brand}</strong>
                    <span>
                      {l.person ? `${l.person} sent ` : "Sent "}
                      {l.form === "brief" ? "a brief" : "a message"}
                    </span>
                    <span className="today-wait">{waited(daysSince(l.at))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

/** One field for what comes to mind: "idea Dany: …" lands in that client's ideas, "lead @…" in the Pipeline. */
function Capture() {
  const clients = useClients();
  const leads = useLeads();
  const members = useMembers();
  const idea = useCaptureIdea();
  const addLeads = useAddLeads();
  const [text, setText] = useState("");
  const [clientId, setClientId] = useState("");
  const [done, setDone] = useState("");
  const list = clients.data ?? [];
  const parsed = parseCapture(text, list);
  const target = parsed?.kind === "idea" ? (parsed.clientId ?? clientId) : "";
  const me = members.data?.find((m) => m.userId)?.id ?? null;
  const error = idea.error ?? addLeads.error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed) return;
    const finish = (msg: string) => {
      setText("");
      setDone(msg);
    };
    if (parsed.kind === "lead") {
      const today = new Date().toISOString().slice(0, 10);
      const { fresh, skipped } = parsePaste(parsed.text, leads.data ?? []);
      if (!fresh.length) {
        setDone(skipped.length ? `${skipped.join(", ")} is already in the Pipeline.` : "");
        return;
      }
      addLeads.mutate(
        fresh.map((p) => ({
          ...blankLead(me, today),
          id: newLeadId(),
          brand: p.brand,
          handle: p.handle,
          url: p.url,
          channel: p.channel,
          next_step: "First message",
        })),
        {
          onSuccess: () =>
            finish(`Added to the Pipeline: ${fresh.map((f) => f.brand).join(", ")}.`),
        },
      );
      return;
    }
    if (!target) return;
    const brand = list.find((c) => c.id === target)?.brand ?? "";
    idea.mutate(
      { clientId: target, title: parsed.title, body: parsed.body },
      { onSuccess: () => finish(`Saved as a draft idea for ${brand}. Only the team sees it.`) },
    );
  };

  return (
    <form className="today-capture" onSubmit={submit}>
      <input
        aria-label="Capture an idea or a lead"
        placeholder="An idea or a lead. Try: idea Dany: the mother-in-law inspects the house · lead @crush__cookies"
        value={text}
        maxLength={2000}
        onChange={(e) => {
          setText(e.target.value);
          setDone("");
        }}
        dir="auto"
      />
      {parsed?.kind === "idea" && !parsed.clientId && (
        <select
          aria-label="For which client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">For which client?</option>
          {list.map((c) => (
            <option key={c.id} value={c.id}>
              {c.brand}
            </option>
          ))}
        </select>
      )}
      <Button
        type="submit"
        disabled={
          !parsed || (parsed.kind === "idea" && !target) || idea.isPending || addLeads.isPending
        }
      >
        {parsed?.kind === "lead" ? "Add lead" : "Save idea"}
      </Button>
      {done && <p className="small today-capture-done">{done}</p>}
      {error && <Notice tone="error">{friendlyError(error)}</Notice>}
    </form>
  );
}
