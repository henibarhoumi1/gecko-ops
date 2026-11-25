import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { isCommitted, talentWaiting, type ProductionOption } from "@/features/production/model";
import { useTeamProduction } from "@/features/production/productionApi";
import { setsForProject, useProjectSets } from "@/features/projects/setsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { cleanText } from "@/features/scripts/clean";
import type { Script } from "@/features/scripts/model";

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
