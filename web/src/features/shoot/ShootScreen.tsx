import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { whatsappLink } from "@/features/clients/messages";
import { todayIso } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { plural, t } from "@/lib/i18n";
import {
  callSheet,
  dayLabel,
  mapHref,
  nextReel,
  progress,
  REEL_STATUSES,
  relativeDay,
  sideName,
  splitDays,
  stateName,
  statusName,
  whatsappTo,
  type ShootDay,
  type ShootPage,
  type ShootPerson,
  type ShootReel,
} from "./model";
import { inProject, useProjectChoice } from "@/features/projects/projectChoice";
import { Reader } from "./Reader";
import { blankDay, DayForm, dayInput, NoteField, PersonForm, ReelPicker } from "./ShootParts";
import { pendingCount, useShootActions, useShootPage, type ShootTarget } from "./shootApi";

type Actions = ReturnType<typeof useShootActions>;

/**
 * Shoot days: the same screen for the team and the client. `base` is where this screen lives
 * (/clients/<id>/shoot, /shoot in the portal, /shoots/<client> in the team's shoots list).
 */
export function ShootScreen({
  target,
  base,
  brand,
}: {
  target: ShootTarget;
  base: string;
  brand: string;
}) {
  const { dayId } = useParams();
  const page = useShootPage(target);
  const [projectId] = useProjectChoice(target.workspaceId, target.clientId);
  const actions = useShootActions(target);

  if (!page.data) {
    if (page.isError) return <Notice tone="error">{friendlyError(page.error)}</Notice>;
    return <p className="loading">{t("Loading the shoot days…", "Chargement des tournages…")}</p>;
  }
  const offline = page.isError;

  if (dayId) {
    const day = page.data.days.find((d) => d.id === dayId);
    if (!day)
      return (
        <section className="tab-body">
          <p className="empty-state">
            {t("This shoot day is no longer here.", "Ce tournage n'est plus là.")}{" "}
            <Link to={base}>{t("All shoot days", "Tous les tournages")}</Link>
          </p>
        </section>
      );
    return (
      <DayView
        key={day.id}
        day={day}
        page={page.data}
        target={target}
        actions={actions}
        base={base}
        brand={brand}
        offline={offline}
      />
    );
  }
  return (
    <DayList
      page={{ ...page.data, days: inProject(page.data.days, projectId) }}
      projectId={projectId}
      actions={actions}
      base={base}
      offline={offline}
    />
  );
}

function OfflineNote({ target }: { target?: ShootTarget }) {
  const waiting = target ? pendingCount(target) : 0;
  return (
    <p className="shoot-offline small" role="status">
      {t(
        "No connection: showing the last copy saved on this phone.",
        "Pas de connexion : dernière copie enregistrée sur ce téléphone.",
      )}
      {waiting > 0 &&
        ` ${plural(waiting, ["change waits", "changes wait"], ["changement attend", "changements attendent"])} ${t("for the signal.", "le réseau.")}`}
    </p>
  );
}

// ---------- the list of days ----------

function DayList({
  page,
  projectId,
  actions,
  base,
  offline,
}: {
  page: ShootPage;
  projectId: string | null;
  actions: Actions;
  base: string;
  offline: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayIso();
  const [adding, setAdding] = useState(false);
  // A day just removed from its page: offer to bring it back.
  const [removed, setRemoved] = useState<string | null>(
    () => (location.state as { removed?: string } | null)?.removed ?? null,
  );
  const { upcoming, past } = splitDays(page.days, today);

  return (
    <section className="tab-body shoot">
      {offline && <OfflineNote />}
      <div className="page-head">
        <p className="lede">
          {t(
            "Each shoot day has one page for everyone on set: the plan, the people, the scripts to read, and what's already shot.",
            "Chaque jour de tournage a une page pour toute l'équipe : le plan, les personnes, les scripts à lire, et ce qui est déjà tourné.",
          )}
        </p>
        {page.canPlan && !adding && (
          <Button onClick={() => setAdding(true)}>Add a shoot day</Button>
        )}
      </div>
      {removed && (
        <Notice>
          Shoot day removed.{" "}
          <Button
            variant="link"
            onClick={() =>
              actions.restoreDay.mutate(removed, { onSuccess: () => setRemoved(null) })
            }
          >
            Undo
          </Button>
        </Notice>
      )}
      {adding && (
        <DayForm
          initial={blankDay(today, projectId)}
          actions={actions}
          onCancel={() => setAdding(false)}
          onSaved={(id) => navigate(`${base}/${id}`)}
        />
      )}
      {upcoming.length === 0 && !adding && (
        <p className="empty-state">
          {page.canPlan
            ? "No shoot coming up. Add the day, then put the approved scripts on it."
            : t(
                "No shoot date yet. Gecko adds it here once it's set.",
                "Pas encore de date de tournage. Gecko l'ajoute ici dès qu'elle est fixée.",
              )}
        </p>
      )}
      <ul className="shoot-days">
        {upcoming.map((d) => (
          <DayCard key={d.id} day={d} base={base} today={today} />
        ))}
      </ul>
      {past.length > 0 && (
        <>
          <h2 className="shoot-h">{t("Past shoots", "Tournages passés")}</h2>
          <ul className="shoot-days past">
            {past.map((d) => (
              <DayCard key={d.id} day={d} base={base} today={today} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DayCard({ day, base, today }: { day: ShootDay; base: string; today: string }) {
  const p = progress(day.reels);
  return (
    <li>
      <Link className={`shoot-day-card state-${day.state}`} to={`${base}/${day.id}`}>
        <span className="shoot-day-when">
          <strong>{dayLabel(day.day)}</strong>
          <span className="small">{relativeDay(day.day, today)}</span>
        </span>
        <span className="shoot-day-what">
          <strong dir="auto">{day.title || t("Shoot day", "Tournage")}</strong>
          <span className="small" dir="auto">
            {[day.callTime && `${t("Call", "Convocation")} ${day.callTime}`, day.place]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className="shoot-day-count small">
          {p.total
            ? t(`${p.done} of ${p.total} shot`, `${p.done} sur ${p.total} tournées`)
            : t("No reels yet", "Pas encore de vidéos")}
          {day.state !== "planned" && <span className="tag">{stateName(day.state)}</span>}
        </span>
      </Link>
    </li>
  );
}

// ---------- one day ----------

function DayView({
  day,
  page,
  target,
  actions,
  base,
  brand,
  offline,
}: {
  day: ShootDay;
  page: ShootPage;
  target: ShootTarget;
  actions: Actions;
  base: string;
  brand: string;
  offline: boolean;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const p = progress(day.reels);
  const next = nextReel(day.reels);
  const map = mapHref(day);
  const readingReel = day.reels.find((r) => r.id === reading) ?? null;
  const updateError = actions.updateReel.error ?? actions.orderReels.error;

  const move = (reel: ShootReel, by: -1 | 1) => {
    const ids = day.reels.map((r) => r.id);
    const at = ids.indexOf(reel.id);
    const to = at + by;
    if (to < 0 || to >= ids.length) return;
    [ids[at], ids[to]] = [ids[to]!, ids[at]!];
    actions.orderReels.mutate({ dayId: day.id, reelIds: ids });
  };

  const sheet = callSheet(brand, day);

  return (
    <section className="tab-body shoot shoot-day">
      {offline && <OfflineNote target={target} />}
      <p className="small">
        <Link to={base}>← {t("All shoot days", "Tous les tournages")}</Link>
      </p>

      {editing ? (
        <DayForm
          initial={dayInput(day)}
          actions={actions}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : (
        <header className="shoot-head">
          <div>
            <p className="eyebrow">
              {dayLabel(day.day)} · {relativeDay(day.day, todayIso())}
              {day.state !== "planned" && <span className="tag">{stateName(day.state)}</span>}
            </p>
            <h2 className="shoot-title" dir="auto">
              {day.title || t("Shoot day", "Tournage")}
            </h2>
            <p className="shoot-when">
              {day.callTime && (
                <span>
                  {t("Call", "Convocation")} <strong>{day.callTime}</strong>
                </span>
              )}
              {day.wrapTime && (
                <span>
                  {t("Wrap", "Fin")} <strong>{day.wrapTime}</strong>
                </span>
              )}
              {(day.place || day.address) && (
                <span dir="auto">
                  {[day.place, day.address].filter(Boolean).join(", ")}
                  {map && (
                    <>
                      {" "}
                      <a href={map} target="_blank" rel="noreferrer noopener">
                        {t("Map", "Plan")}
                      </a>
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="shoot-progress" aria-label={t("Progress", "Avancement")}>
            <strong>
              {p.done}/{p.total}
            </strong>
            <span className="small">{t("reels shot", "vidéos tournées")}</span>
            <span className="shoot-bar">
              <span style={{ width: p.total ? `${(100 * p.done) / p.total}%` : "0%" }} />
            </span>
          </div>
        </header>
      )}

      {!editing && (
        <div className="shoot-actions">
          {page.team && day.state === "planned" && (
            <Button onClick={() => actions.setState.mutate({ id: day.id, state: "live" })}>
              Start the day
            </Button>
          )}
          {page.team && day.state === "live" && (
            <Button onClick={() => actions.setState.mutate({ id: day.id, state: "wrapped" })}>
              Wrap the day
            </Button>
          )}
          {page.team && day.state === "wrapped" && (
            <Button
              variant="secondary"
              onClick={() => actions.setState.mutate({ id: day.id, state: "live" })}
            >
              Back to shooting
            </Button>
          )}
          {page.team && (
            <>
              <a
                className="btn btn-secondary"
                href={whatsappLink(sheet)}
                target="_blank"
                rel="noreferrer noopener"
              >
                Send the call sheet
              </a>
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(sheet).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  );
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  document.body.classList.add("printing-shoot");
                  window.print();
                  document.body.classList.remove("printing-shoot");
                }}
              >
                Print
              </Button>
            </>
          )}
          {page.canPlan && (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit the day
              </Button>
              <Button
                variant="link"
                onClick={() =>
                  actions.removeDay.mutate(day.id, {
                    onSuccess: () => navigate(base, { state: { removed: day.id } }),
                  })
                }
              >
                Remove the day
              </Button>
            </>
          )}
        </div>
      )}
      {actions.setState.isError && (
        <Notice tone="error">{friendlyError(actions.setState.error)}</Notice>
      )}

      {day.state === "wrapped" && <WrapSummary day={day} />}

      {next && day.state !== "wrapped" && (
        <div className="shoot-next">
          <div>
            <p className="eyebrow">
              {next.status === "shooting" ? t("Shooting now", "En cours") : t("Next up", "Ensuite")}
            </p>
            <strong dir="auto">{next.title}</strong>
            {next.talent.length > 0 && (
              <span className="small" dir="auto">
                {" "}
                · {next.talent.join(", ")}
              </span>
            )}
          </div>
          <Button onClick={() => setReading(next.id)}>{t("Read", "Lire")}</Button>
        </div>
      )}

      {updateError && <Notice tone="error">{friendlyError(updateError)}</Notice>}

      <div className="shoot-grid">
        <section className="shoot-section shoot-reels">
          <div className="shoot-section-head">
            <h3>
              {t("Reels", "Vidéos")} <span className="count">{day.reels.length}</span>
            </h3>
            {page.canPlan && !picking && (
              <Button variant="secondary" className="btn-small" onClick={() => setPicking(true)}>
                Choose reels
              </Button>
            )}
          </div>
          {picking && (
            <ReelPicker
              dayId={day.id}
              reels={day.reels}
              scripts={page.scripts}
              actions={actions}
              onDone={() => setPicking(false)}
            />
          )}
          {day.reels.length === 0 && !picking && (
            <p className="empty-state">
              {page.canPlan
                ? "No reels on this day yet. Choose the scripts to shoot."
                : t(
                    "The reels for this day aren't set yet.",
                    "Les vidéos de ce jour ne sont pas encore choisies.",
                  )}
            </p>
          )}
          <ol className="shoot-reel-list">
            {day.reels.map((r, i) => (
              <ReelRow
                key={r.id}
                reel={r}
                n={i + 1}
                last={i === day.reels.length - 1}
                canTick={page.canTick}
                team={page.team}
                onRead={() => setReading(r.id)}
                onMove={(by) => move(r, by)}
                onUpdate={(changes) => actions.updateReel.mutate({ reelId: r.id, changes })}
              />
            ))}
          </ol>
        </section>

        <aside className="shoot-side">
          <People day={day} page={page} actions={actions} />
          {(day.notes || (page.team && day.privateNotes)) && (
            <section className="shoot-section">
              <h3>{t("Brief", "Brief")}</h3>
              {day.notes && (
                <p className="shoot-notes" dir="auto">
                  {day.notes}
                </p>
              )}
              {page.team && day.privateNotes && (
                <p className="shoot-private small" dir="auto">
                  <strong>Only Gecko sees this:</strong> {day.privateNotes}
                </p>
              )}
            </section>
          )}
          <Log day={day} actions={actions} />
        </aside>
      </div>

      {readingReel && (
        <Reader
          key={readingReel.id}
          reel={readingReel}
          canTick={page.canTick}
          hasNext={Boolean(nextReel(day.reels.filter((r) => r.id !== readingReel.id)))}
          onUpdate={(changes) => actions.updateReel.mutate({ reelId: readingReel.id, changes })}
          onNextReel={() => {
            const after = nextReel(day.reels.filter((r) => r.id !== readingReel.id));
            setReading(after?.id ?? null);
          }}
          onClose={() => setReading(null)}
        />
      )}
    </section>
  );
}

function ReelRow({
  reel,
  n,
  last,
  canTick,
  team,
  onRead,
  onMove,
  onUpdate,
}: {
  reel: ShootReel;
  n: number;
  last: boolean;
  canTick: boolean;
  team: boolean;
  onRead: () => void;
  onMove: (by: -1 | 1) => void;
  onUpdate: (changes: { status?: ShootReel["status"]; note?: string }) => void;
}) {
  const changed = Object.keys(reel.lineChanges).length;
  const who = [
    reel.talent.join(", "),
    reel.set,
    reel.props.length ? reel.props.join(", ") : null,
    team ? reel.extraProps : null,
  ].filter(Boolean);
  return (
    <li className={`shoot-reel status-${reel.status}`}>
      <div className="shoot-reel-top">
        <span className="shoot-reel-n">{n}</span>
        <div className="shoot-reel-what">
          <strong dir="auto">
            {reel.slot && <span className="shoot-slot">{reel.slot}</span>}
            {reel.title}
          </strong>
          {who.length > 0 && (
            <span className="small" dir="auto">
              {who.join(" · ")}
            </span>
          )}
          {!reel.shared && (
            <span className="small">
              {t(
                "Gecko hasn't sent you this script yet.",
                "Gecko ne vous a pas encore envoyé ce script.",
              )}
            </span>
          )}
        </div>
        <Button variant="secondary" className="btn-small" onClick={onRead}>
          {t("Read", "Lire")}
        </Button>
      </div>
      <div className="shoot-reel-status">
        {canTick ? (
          <div className="shoot-status" role="group" aria-label={t("Status", "Statut")}>
            {REEL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`shoot-status-btn s-${s}`}
                aria-pressed={reel.status === s}
                onClick={() => reel.status !== s && onUpdate({ status: s })}
              >
                {statusName(s)}
              </button>
            ))}
          </div>
        ) : (
          <span className={`shoot-status-text s-${reel.status}`}>{statusName(reel.status)}</span>
        )}
        {canTick && (
          <span className="shoot-move">
            <button
              type="button"
              aria-label={t("Move up", "Monter")}
              disabled={n === 1}
              onClick={() => onMove(-1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={t("Move down", "Descendre")}
              disabled={last}
              onClick={() => onMove(1)}
            >
              ↓
            </button>
          </span>
        )}
      </div>
      {canTick ? (
        <NoteField
          label={t(
            "Notes for the edit: best take, what changed",
            "Notes pour le montage : meilleure prise, ce qui a changé",
          )}
          value={reel.note}
          onSave={(note) => onUpdate({ note })}
        />
      ) : (
        reel.note && (
          <p className="small" dir="auto">
            {reel.note}
          </p>
        )
      )}
      {(changed > 0 || reel.linesDone.length > 0) && (
        <p className="small">
          {reel.linesDone.length > 0 &&
            plural(
              reel.linesDone.length,
              ["line in the can", "lines in the can"],
              ["ligne dans la boîte", "lignes dans la boîte"],
            )}
          {reel.linesDone.length > 0 && changed > 0 && " · "}
          {changed > 0 &&
            plural(
              changed,
              ["line said differently", "lines said differently"],
              ["ligne dite autrement", "lignes dites autrement"],
            )}
          {reel.updatedBy && ` · ${reel.updatedBy}`}
        </p>
      )}
    </li>
  );
}

function People({ day, page, actions }: { day: ShootDay; page: ShootPage; actions: Actions }) {
  const [editing, setEditing] = useState<ShootPerson | "new" | null>(null);
  return (
    <section className="shoot-section">
      <div className="shoot-section-head">
        <h3>
          {t("People", "Équipe")} <span className="count">{day.people.length}</span>
        </h3>
        {page.canPlan && editing === null && (
          <Button variant="secondary" className="btn-small" onClick={() => setEditing("new")}>
            Add
          </Button>
        )}
      </div>
      {editing !== null && (
        <PersonForm
          dayId={day.id}
          person={editing === "new" ? null : editing}
          actions={actions}
          onDone={() => setEditing(null)}
        />
      )}
      {day.people.length === 0 && editing === null && (
        <p className="small">{t("No one listed yet.", "Personne pour l'instant.")}</p>
      )}
      <ul className="shoot-people">
        {day.people.map((person) => {
          const wa = whatsappTo(person.phone);
          return (
            <li key={person.id}>
              <span>
                <strong dir="auto">{person.name}</strong>
                <span className="small" dir="auto">
                  {[person.role || sideName(person.side), person.callTime]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="shoot-person-links small">
                {person.phone && <a href={`tel:${person.phone.replace(/\s/g, "")}`}>Call</a>}
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer noopener">
                    WhatsApp
                  </a>
                )}
                {page.canPlan && (
                  <>
                    <Button variant="link" onClick={() => setEditing(person)}>
                      Edit
                    </Button>
                    <Button variant="link" onClick={() => actions.removePerson.mutate(person.id)}>
                      Remove
                    </Button>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Log({ day, actions }: { day: ShootDay; actions: Actions }) {
  const [body, setBody] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    actions.log.mutate({ dayId: day.id, body }, { onSuccess: () => setBody("") });
  };
  return (
    <section className="shoot-section">
      <h3>{t("Log of the day", "Journal du jour")}</h3>
      <form className="shoot-log-form" onSubmit={submit}>
        <input
          aria-label={t("Add to the log", "Ajouter au journal")}
          placeholder={t("Arrived, lunch, a change…", "Arrivés, déjeuner, un changement…")}
          value={body}
          maxLength={1000}
          onChange={(e) => setBody(e.target.value)}
          dir="auto"
        />
        <Button type="submit" className="btn-small" disabled={actions.log.isPending}>
          {t("Add", "Ajouter")}
        </Button>
      </form>
      {actions.log.isError && <Notice tone="error">{friendlyError(actions.log.error)}</Notice>}
      <ul className="shoot-log">
        {day.log.map((l) => (
          <li key={l.id}>
            <span className="small">
              {new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
              · {l.authorName}
            </span>
            <span dir="auto">{l.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** At the end of the day: what was shot, what wasn't, and the notes for the edit. */
function WrapSummary({ day }: { day: ShootDay }) {
  const p = progress(day.reels);
  const notShot = day.reels.filter((r) => r.status !== "done");
  return (
    <section className="shoot-section shoot-wrap">
      <h3>{t("Wrap", "Bilan")}</h3>
      <p>
        {t(`${p.done} of ${p.total} reels shot.`, `${p.done} vidéos tournées sur ${p.total}.`)}{" "}
        {p.pickup > 0 &&
          plural(
            p.pickup,
            ["needs a pick-up.", "need a pick-up."],
            ["à retourner.", "à retourner."],
          )}
      </p>
      {notShot.length > 0 && (
        <p className="small" dir="auto">
          {t("Not shot:", "Pas tournées :")} {notShot.map((r) => r.title).join(", ")}
        </p>
      )}
    </section>
  );
}
