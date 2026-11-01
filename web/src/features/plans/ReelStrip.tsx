import type { Script } from "@/features/scripts/model";
import { PLANS, reelSlots, type PlanId, type ReelState } from "./model";
import { t } from "@/lib/i18n";

const stateLabel = (state: ReelState) =>
  ({
    approved: t("Script approved", "Script validé"),
    review: t("Script waiting for approval", "Script en attente de validation"),
    writing: t("Script being written", "Script en cours d'écriture"),
    open: t("Not started", "Pas commencé"),
  })[state];

/** Plan names stay as they are sold; only "The Test" and the cadence read in French. */
const planName = (plan: PlanId) => (plan === "test" ? t("The Test", "Le Test") : PLANS[plan].label);
const cadence = (plan: PlanId) =>
  plan === "test"
    ? t("one campaign", "une campagne")
    : PLANS[plan].cadence
      ? t("every month", "chaque mois")
      : "";

/**
 * The reels in the plan as a strip of frames: each frame fills as its script moves along. Reads the same on the
 * team's side and the client's.
 */
export function ReelStrip({
  plan,
  reels,
  scripts,
  reader,
}: {
  plan: PlanId;
  reels: number;
  scripts: Pick<Script, "status">[];
  reader: "client" | "team";
}) {
  const slots = reelSlots(reels, scripts);
  const approved = slots.filter((s) => s === "approved").length;
  const review = slots.filter((s) => s === "review").length;
  const parts = [
    t(`${approved} of ${reels} scripts approved`, `${approved} script(s) validé(s) sur ${reels}`),
    review > 0 &&
      (reader === "client"
        ? t(`${review} waiting for you`, `${review} en attente de votre avis`)
        : `${review} with the client`),
  ].filter(Boolean);

  return (
    <section className="reel-strip" aria-label={t("Reels in the plan", "Vidéos du plan")}>
      <div className="reel-strip-head">
        <h2>
          {plan !== "custom"
            ? planName(plan)
            : reader === "client"
              ? t("Your reels", "Vos vidéos")
              : "Reels in the plan"}
          {cadence(plan) && <span className="muted"> · {cadence(plan)}</span>}
        </h2>
        <p className="small">{parts.join(" · ")}</p>
      </div>
      {reels <= 40 && (
        <ol className="frames">
          {slots.map((state, i) => (
            <li key={i} className={`frame frame-${state}`} title={stateLabel(state)}>
              <span className="visually-hidden">
                {t("Reel", "Vidéo")} {i + 1}: {stateLabel(state)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="frames-key small muted">
        <span className="key key-approved" /> {t("Approved", "Validé")}
        <span className="key key-review" />{" "}
        {reader === "client" ? t("Waiting for you", "Vous attend") : "With the client"}
        <span className="key key-writing" /> {t("Being written", "En écriture")}
      </p>
    </section>
  );
}
