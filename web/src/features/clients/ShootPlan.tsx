import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import {
  isCommitted,
  talentRole,
  talentWaiting,
  type ProductionOption,
} from "@/features/production/model";
import { useTeamProduction } from "@/features/production/productionApi";
import {
  setsForProject,
  useCurrentProject,
  useProjectSets,
  useSetActions,
} from "@/features/projects/setsApi";
import { friendlyError } from "@/lib/errors";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { cleanText } from "@/features/scripts/clean";
import type { Script, ShootPlan } from "@/features/scripts/model";

/**
 * What a script can be shot with: the client's talent (with where each stands: Gecko's yes and the brand owner's),
 * the campaign's set list, and the approved props. "named" turns any picked id into a name, sets included.
 */
export function useApprovedProduction(clientId: string, projectId?: string | null) {
  const { id: workspaceId } = useWorkspace();
  const target = useMemo(() => ({ workspaceId, clientId }), [workspaceId, clientId]);
  const production = useTeamProduction(target);
  const allSets = useProjectSets(clientId);
  const all = production.data?.options ?? [];
  const ok = all.filter(isCommitted);
  const order = { ready: 0, waiting: 1, passed: 2 } as const;
  const talent = all
    .filter((o) => o.kind === "talent" && o.status !== "suggested" && o.status !== "passed")
    .map((o) => ({ option: o, stands: talentWaiting(o) }))
    .sort(
      (a, b) => order[a.stands] - order[b.stands] || a.option.name.localeCompare(b.option.name),
    );
  const sets = setsForProject(allSets.data ?? [], projectId ?? null);
  // Scripts written before the set list picked an approved location; those still show.
  const places = ok.filter((o) => o.kind === "location");
  return {
    talent,
    sets,
    places,
    props: ok.filter((o) => o.kind === "prop"),
    all,
    named: [...all, ...(allSets.data ?? [])].map((x) => ({ id: x.id, name: x.name })),
  };
}

const STANDS: Record<string, string> = {
  ready: "approved",
  waiting: "not approved yet",
};

/** One or more talent for an idea: the client's talent, with where each one's approvals stand. */
export function TalentPicker({
  clientId,
  value,
  onChange,
}: {
  clientId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const { talent } = useApprovedProduction(clientId);
  return (
    <div className="shoot-plan-row">
      <span className="small">
        <strong>Talent</strong> (one or more, optional)
      </span>
      {talent.length === 0 ? (
        <span className="small">No talent proposed yet. Propose some in Production.</span>
      ) : (
        <div className="chips">
          {talent.map(({ option: o, stands }) => (
            <button
              key={o.id}
              type="button"
              className={`chip talent-${stands}`}
              aria-pressed={value.includes(o.id)}
              title={STANDS[stands]}
              onClick={() =>
                onChange(value.includes(o.id) ? value.filter((x) => x !== o.id) : [...value, o.id])
              }
            >
              {stands === "ready" ? <Icon name="check" size={12} /> : null}
              {o.name}
              {stands !== "ready" ? ` · ${STANDS[stands]}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Who plays it, on which set, with what. Talent can be picked while its approvals come in; the set comes from the campaign's set list. */
export function ShootPlanPicker({
  clientId,
  projectId,
  plan,
  onChange,
}: {
  clientId: string;
  projectId?: string | null;
  plan: ShootPlan;
  onChange: (plan: ShootPlan) => void;
}) {
  const current = useCurrentProject(clientId);
  const campaign = projectId ?? current.id;
  const { talent, sets, places, props } = useApprovedProduction(clientId, campaign);
  const setActions = useSetActions(clientId);
  const [newSet, setNewSet] = useState("");
  const [error, setError] = useState("");
  const toggle = (list: string[] | undefined, id: string) =>
    (list ?? []).includes(id) ? (list ?? []).filter((x) => x !== id) : [...(list ?? []), id];

  async function addSet() {
    const name = newSet.trim();
    if (!name) return;
    setError("");
    try {
      const id = await setActions.add.mutateAsync({
        name,
        projectId: campaign,
        position: (sets.at(-1)?.position ?? 0) + 1,
      });
      onChange({ ...plan, set: id });
      setNewSet("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const setOptions: (readonly [string, string])[] = [
    ["", "Not picked yet"],
    ...sets.map((o) => [o.id, o.name] as const),
    ...places.map((o) => [o.id, `${o.name} (place)`] as const),
  ];

  return (
    <fieldset className="fieldset shoot-plan">
      <legend>Shoot plan · who, where, what</legend>
      <div className="shoot-plan-row">
        <span className="small">
          <strong>Talent</strong> (one or more)
        </span>
        {talent.length === 0 ? (
          <span className="small">No talent proposed yet. Propose some in Production.</span>
        ) : (
          <div className="chips">
            {talent.map(({ option: o, stands }) => (
              <button
                key={o.id}
                type="button"
                className={`chip talent-${stands}`}
                aria-pressed={(plan.talent ?? []).includes(o.id)}
                title={STANDS[stands]}
                onClick={() => onChange({ ...plan, talent: toggle(plan.talent, o.id) })}
              >
                {stands === "ready" ? <Icon name="check" size={12} /> : null}
                {o.name}
                {o.role ? ` · ${talentRole(o.role)}` : ""}
                {stands !== "ready" ? ` · ${STANDS[stands]}` : ""}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="shoot-plan-row">
        <Select
          label="Set"
          name="shoot-set"
          value={plan.set ?? ""}
          onChange={(e) => onChange({ ...plan, set: e.target.value || null })}
          options={setOptions}
        />
        <div className="set-quick">
          <Field
            label="New set for this campaign"
            name="shoot-new-set"
            value={newSet}
            maxLength={120}
            placeholder="Kitchen counter"
            onChange={(e) => setNewSet(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addSet();
              }
            }}
          />
          <Button
            variant="secondary"
            disabled={!newSet.trim() || setActions.add.isPending}
            onClick={() => void addSet()}
          >
            Add set
          </Button>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
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
  options: Pick<ProductionOption, "id" | "name">[];
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
