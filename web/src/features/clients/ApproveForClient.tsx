import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { hookName } from "@/features/scripts/model";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { useApproveForClient } from "./clientsApi";

/**
 * "Approve for the client": for the founder only, when the client said yes on a call, so they don't have to log in
 * and click. The client keeps their own Approve button; whoever approves first counts.
 */
export function ApproveForClient({
  clientId,
  kind,
  id,
  version,
  hooks = 0,
}: {
  clientId: string;
  kind: "concept" | "script" | "cut";
  id: string;
  version: number;
  /** A script's number of hook options: with more than one, the founder says which one the client chose. */
  hooks?: number;
}) {
  const workspace = useWorkspace();
  const approve = useApproveForClient(clientId);
  const [open, setOpen] = useState(false);
  const [hook, setHook] = useState("0");
  if (workspace.role !== "founder") return null;

  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Approve for the client
      </Button>
    );

  return (
    <div className="approve-for">
      <p className="small">
        <strong>The client said yes on a call?</strong> This approves version {version} for them. It
        shows as approved by you for the client, on a call, on both sides.
      </p>
      {kind === "script" && hooks > 1 && (
        <Select
          label="The hook the client chose"
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          options={Array.from({ length: hooks }, (_, i) => [String(i), hookName(i)] as const)}
        />
      )}
      {approve.error && <Notice tone="error">{friendlyError(approve.error)}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={approve.isPending}>
          Cancel
        </Button>
        <Button
          disabled={approve.isPending}
          onClick={() =>
            approve.mutate(
              { kind, id, version, hook: kind === "script" && hooks > 1 ? Number(hook) : null },
              { onSuccess: () => setOpen(false) },
            )
          }
        >
          Approve version {version}
        </Button>
      </div>
    </div>
  );
}
