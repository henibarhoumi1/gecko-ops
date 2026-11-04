import { useState } from "react";
import { Link } from "react-router-dom";
import { Notice } from "@/components/Notice";
import { MessageLang } from "@/features/clients/LoginsPanel";
import { nudgeMessage, whatsappLink, type MsgLang } from "@/features/clients/messages";
import { friendlyError } from "@/lib/errors";
import { originFor } from "@/lib/hosts";
import {
  byClient,
  daysSince,
  hasCreative,
  headline,
  linkFor,
  partName,
  shortDay,
  splitDates,
  waited,
  when,
  whyText,
  type DateItem,
} from "./model";
import { useToday } from "./todayApi";

const KIND: Record<DateItem["kind"], string> = {
  shoot: "Shoot",
  drafts: "Drafts",
  milestone: "Milestone",
  invoice: "Invoice",
  lead: "Lead",
};

function DateRow({ d, today }: { d: DateItem; today: string }) {
  const to = d.client_id ? `/clients/${encodeURIComponent(d.client_id)}` : "/pipeline";
  return (
    <li className={`today-date kind-${d.kind}`}>
      <span className="today-when">
        <strong>{when(d.date, today)}</strong>
        <span className="small">{shortDay(d.date)}</span>
      </span>
      <span className="today-what">
        <span className="today-kind">{KIND[d.kind]}</span>
        <Link to={to}>
          <strong>{d.brand}</strong>
        </Link>{" "}
        {d.label}
      </span>
    </li>
  );
}

/** The founder's and producers' home: what to do now, who to chase, what's coming. */
export function TodayPage() {
  const today = useToday();
  const [lang, setLang] = useState<MsgLang>("fr");

  if (today.isPending) return <p className="loading">Loading…</p>;
  if (today.isError)
    return (
      <section className="page wide">
        <Notice tone="error">{friendlyError(today.error)}</Notice>
      </section>
    );

  const t = today.data;
  const groups = byClient(t.client);
  const { late, coming } = splitDates(t.dates, t.today);
  const portal = originFor("client");

  return (
    <section className="page wide today">
      <header className="page-head">
        <div>
          <h1>Today</h1>
          <p className="today-sum">{headline(t)}</p>
        </div>
        <p className="small today-date-now">{shortDay(t.today)}</p>
      </header>

      {t.problems > 0 && (
        <Notice tone="error">
          {t.problems} {t.problems === 1 ? "problem" : "problems"} in the app since you last looked.{" "}
          <Link to="/alerts">Open Alerts</Link>
        </Notice>
      )}

      <div className="today-grid">
        <section className="today-section today-us">
          <h2>
            Waiting on you <span className="today-count">{t.us.length}</span>
          </h2>
          {t.us.length === 0 ? (
            <p className="empty-state">Nothing from clients is waiting on you.</p>
          ) : (
            <ul className="today-list">
              {t.us.map((u) => (
                <li key={`${u.part}-${u.id}-${u.why}`} className={`why-${u.why}`}>
                  <div className="today-row">
                    <span>
                      <strong>{u.brand}</strong> {whyText(u.why)}
                    </span>
                    <span className="today-wait">{waited(daysSince(u.at))}</span>
                  </div>
                  <Link className="today-title" to={linkFor(u)}>
                    {partName(u.part)}: {u.title}
                  </Link>
                  {u.body && <p className="today-quote">&ldquo;{u.body}&rdquo;</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="today-section today-client">
          <div className="today-section-head">
            <h2>
              Waiting on clients <span className="today-count">{t.client.length}</span>
            </h2>
            {groups.some((g) => hasCreative(g.waiting)) && (
              <MessageLang lang={lang} onChange={setLang} />
            )}
          </div>
          {groups.length === 0 ? (
            <p className="empty-state">Nothing is waiting for a client&rsquo;s answer.</p>
          ) : (
            groups.map((g) => (
              <div key={g.client_id} className="today-group">
                <div className="today-row">
                  <Link to={`/clients/${encodeURIComponent(g.client_id)}`}>
                    <strong>{g.brand}</strong>
                  </Link>
                  {hasCreative(g.waiting) && (
                    <a
                      className="btn btn-secondary btn-small"
                      href={whatsappLink(nudgeMessage(lang, g.waiting, portal))}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Remind on WhatsApp
                    </a>
                  )}
                </div>
                <ul className="today-list compact">
                  {g.items.map((i) => {
                    const days = daysSince(i.at);
                    return (
                      <li key={`${i.part}-${i.id}`} className={days >= 3 ? "slow" : ""}>
                        <div className="today-row">
                          <Link to={linkFor(i)}>
                            {partName(i.part)}: {i.title}
                          </Link>
                          <span className="today-wait">
                            {i.part === "invoice" && i.due ? `due ${when(i.due, t.today).toLowerCase()}` : waited(days)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>

        <section className="today-section today-dates">
          <h2>Coming up</h2>
          {late.length > 0 && (
            <>
              <h3 className="today-sub">Slipped</h3>
              <ul className="today-list dates late">
                {late.map((d) => (
                  <DateRow key={`${d.kind}-${d.client_id}-${d.label}-${d.date}`} d={d} today={t.today} />
                ))}
              </ul>
            </>
          )}
          {coming.length === 0 ? (
            <p className="empty-state">
              No shoots, deadlines or follow-ups in the next 30 days. Set a shoot date in a
              client&rsquo;s Overview and the first-draft deadline appears here.
            </p>
          ) : (
            <ul className="today-list dates">
              {coming.map((d) => (
                <DateRow key={`${d.kind}-${d.client_id}-${d.label}-${d.date}`} d={d} today={t.today} />
              ))}
            </ul>
          )}
        </section>

        <section className="today-section today-leads">
          <h2>
            New from the website <span className="today-count">{t.leads.length}</span>
          </h2>
          {t.leads.length === 0 ? (
            <p className="empty-state">No new briefs or messages in the last two weeks.</p>
          ) : (
            <ul className="today-list compact">
              {t.leads.map((l) => (
                <li key={l.id}>
                  <div className="today-row">
                    <span>
                      <strong>{l.brand}</strong>
                      {l.person ? ` · ${l.person}` : ""} sent{" "}
                      {l.form === "brief" ? "a brief" : "a message"}
                    </span>
                    <span className="today-wait">{waited(daysSince(l.at))}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {t.leads.length > 0 && (
            <p className="small">
              <Link to="/pipeline">Open the Pipeline</Link>
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
