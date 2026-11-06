import { useState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { isCommitted, talentRole, type ProductionOption } from "@/features/production/model";
import { useTeamProduction } from "@/features/production/productionApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { cleanText } from "@/features/scripts/clean";
import type { Script, ShootPlan } from "@/features/scripts/model";

/** The client's approved talent, sets and props: what a script can be shot with. */
export function useApprovedProduction(clientId: string) {
  const { id: workspaceId } = useWorkspace();
  const production = useTeamProduction({ workspaceId, clientId });
  const ok = (production.data?.options ?? []).filter(isCommitted);
  return {
    talent: ok.filter((o) => o.kind === "talent"),
    sets: ok.filter((o) => o.kind === "location"),
    props: ok.filter((o) => o.kind === "prop"),
    all: production.data?.options ?? [],
  };
}

/** Who plays it, where, with what. Picks from what the client approved in Production. */
export function ShootPlanPicker({
  clientId,
  plan,
  onChange,
}: {
  clientId: string;
  plan: ShootPlan;
  onChange: (plan: ShootPlan) => void;
}) {
  const { talent, sets, props } = useApprovedProduction(clientId);
  const toggle = (list: string[] | undefined, id: string) =>
    (list ?? []).includes(id) ? (list ?? []).filter((x) => x !== id) : [...(list ?? []), id];

  return (
    <fieldset className="fieldset shoot-plan">
      <legend>Shoot plan · who, where, what</legend>
      <div className="shoot-plan-row">
        <span className="small">
          <strong>Talent</strong>
        </span>
        {talent.length === 0 ? (
          <span className="small">No approved talent yet. Propose some in Production.</span>
        ) : (
          <div className="chips">
            {talent.map((o) => (
              <button
                key={o.id}
                type="button"
                className="chip"
                aria-pressed={(plan.talent ?? []).includes(o.id)}
                onClick={() => onChange({ ...plan, talent: toggle(plan.talent, o.id) })}
              >
                {o.name}
                {o.role ? ` · ${talentRole(o.role)}` : ""}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="shoot-plan-row">
        {sets.length === 0 ? (
          <>
            <span className="small">
              <strong>Set</strong>
            </span>
            <span className="small">No approved place yet. Propose one in Production.</span>
          </>
        ) : (
          <Select
            label="Set"
            name="shoot-set"
            value={plan.set ?? ""}
            onChange={(e) => onChange({ ...plan, set: e.target.value || null })}
            options={[["", "Not picked yet"], ...sets.map((o) => [o.id, o.name] as const)]}
          />
        )}
      </div>
      <div className="shoot-plan-row">
        <span className="small">
          <strong>Props</strong>
        </span>
        {props.length > 0 && (
          <div className="chips">
            {props.map((o) => (
              <button
                key={o.id}
                type="button"
                className="chip"
                aria-pressed={(plan.props ?? []).includes(o.id)}
                onClick={() => onChange({ ...plan, props: toggle(plan.props, o.id) })}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <Field
        label="Other props to bring"
        name="shoot-extra"
        value={plan.extraProps ?? ""}
        maxLength={1000}
        placeholder="A TV with a football match, a long handwritten list"
        onChange={(e) => onChange({ ...plan, extraProps: e.target.value })}
      />
    </fieldset>
  );
}

/** A clean copy of the script to copy, print or save as a PDF. */
export function CleanCopy({
  script,
  options,
  onClose,
}: {
  script: Script;
  options: ProductionOption[];
  onClose: () => void;
}) {
  const text = cleanText(script, options);
  const [copied, setCopied] = useState(false);

  function print() {
    const win = window.open("", "_blank");
    if (!win) return;
    const doc = win.document;
    doc.title = script.title;
    const style = doc.createElement("style");
    style.textContent =
      "body{font:15px/1.6 Helvetica,Arial,sans-serif;max-width:680px;margin:40px auto;padding:0 24px;color:#000}pre{white-space:pre-wrap;font:inherit}";
    doc.head.appendChild(style);
    const pre = doc.createElement("pre");
    pre.textContent = text;
    doc.body.appendChild(pre);
    win.focus();
    win.print();
  }

  return (
    <div className="clean-copy">
      <pre>{text}</pre>
      <div className="concept-actions">
        <Button
          onClick={() =>
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
          }
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="secondary" onClick={print}>
          Print or save as PDF
        </Button>
        <Button variant="link" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
