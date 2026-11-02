import { Link } from "react-router-dom";
import { shortDate } from "@/features/concepts/model";
import { PLANS, type PlanId } from "@/features/plans/model";
import type { Script } from "@/features/scripts/model";
import { locale, t } from "@/lib/i18n";
import { isCinematic, tw, words } from "@/lib/wording";
import { STAGES, stageName, type Stage } from "./stage";

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * The top of Home. Performance: a clean white header with the brand's logo, the campaign and where it stands on a
 * strip of tape. Cinematic: the brand's own still, full width, with the logo in white over it (black until Gecko
 * adds a cover).
 */
export function PortalHeader({
  brand,
  logo,
  cover,
  campaign,
  stage,
}: {
  brand: string;
  logo?: string | null;
  cover?: string | null;
  campaign?: string;
  stage: Stage;
}) {
  const mark = logo ? (
    <h1 className="head-brand">
      <img src={logo} alt={brand} />
    </h1>
  ) : (
    <h1 className="head-brand">{brand}</h1>
  );
  if (isCinematic())
    return (
      <header
        className={`portal-head cine${cover ? " has-cover" : ""}`}
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      >
        <div className="cine-inner">
          {mark}
          {campaign && <p className="head-campaign">{campaign}</p>}
          <p className="head-stage">{stageName(stage)}</p>
        </div>
      </header>
    );
  return (
    <header className="portal-head perf">
      {mark}
      {campaign && <p className="head-campaign">{campaign}</p>}
      <span className="tape head-tape">
        {t("Now", "En ce moment")} · {stageName(stage)}
      </span>
    </header>
  );
}

/** Plan, Prep, Shoot, Edit, Delivery, Results: where the campaign is, with the shoot date where it belongs. */
export function StageTracker({
  stage,
  shootDate,
  shootPlace,
}: {
  stage: Stage;
  shootDate: string | null;
  shootPlace: string;
}) {
  const at = STAGES.indexOf(stage);
  return (
    <ol className="stages" aria-label={t("Where your campaign is", "Où en est votre campagne")}>
      {STAGES.map((s, i) => (
        <li
          key={s}
          className={i < at ? "done" : i === at ? "now" : ""}
          aria-current={i === at ? "step" : undefined}
        >
          <span className="stage-dot" aria-hidden="true" />
          <span className="stage-name">{stageName(s)}</span>
          {s === "shoot" && (
            <span className="stage-when small">
              {shootDate ? longDate(shootDate) : t("Date to come", "Date à venir")}
              {shootPlace && <span className="muted"> · {shootPlace}</span>}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

const statusWord = (status: Script["status"]) =>
  ({
    draft: t("Being written", "En écriture"),
    review: t("Waiting for you", "Vous attend"),
    changes: t("Being reworked", "En reprise"),
    approved: t("Approved", "Validé"),
  })[status];

/**
 * What the plan holds and how far along it is: one small card per script, then one card for the ones not written
 * yet, instead of a row of empty squares.
 */
export function Progress({
  plan,
  reels,
  scripts,
}: {
  plan: PlanId;
  reels: number | null;
  scripts: Pick<Script, "id" | "title" | "status" | "updatedAt">[];
}) {
  if (!reels && scripts.length === 0) return null;
  const approved = scripts.filter((s) => s.status === "approved").length;
  const total = reels ?? scripts.length;
  const left = Math.max(0, total - scripts.length);
  const name =
    plan !== "custom" ? (plan === "test" ? t("The Test", "Le Test") : PLANS[plan].label) : null;
  return (
    <section className="progress" aria-labelledby="progress-title">
      <div className="progress-head">
        <h2 id="progress-title">
          {name ?? words.pieces()}
          {PLANS[plan].cadence && plan !== "test" && (
            <span className="muted"> · {t("every month", "chaque mois")}</span>
          )}
        </h2>
        <p className="small">
          {tw(
            [
              `${approved} of ${total} scripts approved`,
              `${approved} script${approved > 1 ? "s" : ""} validé${approved > 1 ? "s" : ""} sur ${total}`,
            ],
            [
              `${approved} of ${total} treatments approved`,
              `${approved} note${approved > 1 ? "s" : ""} d'intention validée${approved > 1 ? "s" : ""} sur ${total}`,
            ],
          )}
        </p>
      </div>
      <ul className="pieces">
        {scripts.map((s) => (
          <li key={s.id}>
            <Link to="/scripts" className={`piece piece-${s.status}`}>
              <strong dir="auto">{s.title}</strong>
              <span className="small">{statusWord(s.status)}</span>
              <span className="small muted">{shortDate(s.updatedAt)}</span>
            </Link>
          </li>
        ))}
        {left > 0 && (
          <li>
            <div className="piece piece-todo">
              <strong>
                {tw(
                  [
                    `${left} more ${left === 1 ? "reel" : "reels"} to write`,
                    `${left} vidéo${left > 1 ? "s" : ""} de plus à écrire`,
                  ],
                  [
                    `${left} more ${left === 1 ? "film" : "films"} to write`,
                    `${left} film${left > 1 ? "s" : ""} de plus à écrire`,
                  ],
                )}
              </strong>
              <span className="small muted">
                {tw(
                  [
                    "Gecko writes them from the ideas you approve.",
                    "Gecko les écrit à partir des idées que vous validez.",
                  ],
                  [
                    "Gecko writes them from the concepts you approve.",
                    "Gecko les écrit à partir des concepts que vous validez.",
                  ],
                )}
              </span>
            </div>
          </li>
        )}
      </ul>
    </section>
  );
}
