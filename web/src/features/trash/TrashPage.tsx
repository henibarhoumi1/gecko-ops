import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useRemovedClients, useRestoreClient } from "@/features/clients/clientsApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { useHashScroll } from "@/lib/useHashScroll";
import { friendlyError } from "@/lib/errors";
import { kindName, useEmptyTrash, useRestore, useTrash } from "./trashApi";

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Everything deleted in the last 30 days, by anyone, on either side. One click puts it back. */
export function TrashPage() {
  const { id: workspaceId, role } = useWorkspace();
  const trash = useTrash(workspaceId);
  const restore = useRestore(workspaceId);
  const empty = useEmptyTrash(workspaceId);
  const [sure, setSure] = useState(false);
  if (trash.isPending) return <p className="loading">Loading the trash…</p>;
  if (trash.isError) return <Notice tone="error">{friendlyError(trash.error)}</Notice>;
  const waiting = trash.data.filter((e) => !e.restoredAt);
  const back = trash.data.filter((e) => e.restoredAt);
  return (
    <section className="page wide trash">
      <header className="page-head">
        <div>
          <h1>Trash</h1>
          <p>
            Everything deleted in the last 7 days, by the team or a client, with what went with it.
            Restore puts it back where it was. After 7 days, items are gone for good.
          </p>
        </div>
      </header>
      {restore.isError && <Notice tone="error">{friendlyError(restore.error)}</Notice>}
      {role === "founder" && waiting.length > 0 && (
        <div className="actions">
          {sure ? (
            <>
              <span>Destroy everything in the trash for good? This can&rsquo;t be undone.</span>
              <Button
                disabled={empty.isPending}
                onClick={() => empty.mutate(undefined, { onSuccess: () => setSure(false) })}
              >
                Yes, empty it
              </Button>
              <Button variant="link" onClick={() => setSure(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setSure(true)}>
              Empty the trash
            </Button>
          )}
        </div>
      )}
      {empty.isError && <Notice tone="error">{friendlyError(empty.error)}</Notice>}
      {role === "founder" && <RemovedClients workspaceId={workspaceId} />}
      {waiting.length === 0 ? (
        <p className="empty-state">The trash is empty.</p>
      ) : (
        <ul className="trash-list">
          {waiting.map((e) => (
            <li key={e.batch}>
              <span className="trash-what">
                <strong dir="auto">{e.label}</strong>
                <span className="small">
                  {[
                    kindName(e.kind),
                    e.brand,
                    e.withIt > 0 ? `${e.withIt} more with it` : null,
                    `deleted by ${e.deletedBy || "someone"}, ${when(e.deletedAt)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <Button
                variant="secondary"
                className="btn-small"
                disabled={restore.isPending}
                onClick={() => restore.mutate(e.batch)}
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
      {back.length > 0 && (
        <>
          <h2 className="trash-h">Restored</h2>
          <ul className="trash-list restored">
            {back.map((e) => (
              <li key={e.batch}>
                <span className="trash-what">
                  <strong dir="auto">{e.label}</strong>
                  <span className="small">
                    {kindName(e.kind)} · restored by {e.restoredBy || "someone"},{" "}
                    {when(e.restoredAt ?? "")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Clients the founder deleted. They never expire: Restore brings each back with everything it had. */
function RemovedClients({ workspaceId }: { workspaceId: string }) {
  const removed = useRemovedClients(workspaceId, true);
  const restore = useRestoreClient(workspaceId);
  useHashScroll(!removed.isPending);
  if (!removed.data || removed.data.length === 0) return null;
  return (
    <div id="deleted-clients" className="removed-clients">
      <h2 className="trash-h">Deleted clients</h2>
      <p className="small">
        Hidden from every page and their portal is closed, but nothing was destroyed. These stay
        here until you restore them.
      </p>
      {restore.isError && <Notice tone="error">{friendlyError(restore.error)}</Notice>}
      <ul className="trash-list">
        {removed.data.map((c) => (
          <li key={c.id}>
            <span className="trash-what">
              <strong dir="auto">{c.brand}</strong>
              <span className="small">
                Client · deleted by {c.removedBy || "someone"}, {when(c.removedAt)}
              </span>
            </span>
            <Button
              variant="secondary"
              className="btn-small"
              disabled={restore.isPending}
              onClick={() => restore.mutate(c.id)}
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
