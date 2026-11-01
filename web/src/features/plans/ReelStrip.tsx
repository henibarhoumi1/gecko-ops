import type { Script } from "@/features/scripts/model";
import { PLANS, reelSlots, type PlanId } from "./model";

const STATE_LABEL = {
  approved: "Script approved",
  review: "Script waiting for approval",
  writing: "Script being written",
  open: "Not started",
} as const;

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
  const p = PLANS[plan];
  const parts = [
    `${approved} of ${reels} scripts approved`,
    review > 0 && (reader === "client" ? `${review} waiting for you` : `${review} with the client`),
  ].filter(Boolean);

  return (
    <section className="reel-strip" aria-label="Reels in the plan">
      <div className="reel-strip-head">
        <h2>
          {plan !== "custom" ? p.label : reader === "client" ? "Your reels" : "Reels in the plan"}
          {p.cadence && <span className="muted"> · {p.cadence.toLowerCase()}</span>}
        </h2>
        <p className="small">{parts.join(" · ")}</p>
      </div>
      {reels <= 40 && (
        <ol className="frames">
          {slots.map((state, i) => (
            <li key={i} className={`frame frame-${state}`} title={STATE_LABEL[state]}>
              <span className="visually-hidden">
                Reel {i + 1}: {STATE_LABEL[state]}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="frames-key small muted">
        <span className="key key-approved" /> Approved
        <span className="key key-review" />{" "}
        {reader === "client" ? "Waiting for you" : "With the client"}
        <span className="key key-writing" /> Being written
      </p>
    </section>
  );
}
