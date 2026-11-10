import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { kindName, useRestore, useTrash } from "./trashApi";

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
  const { id: workspaceId } = useWorkspace();
  const trash = useTrash(workspaceId);
  const restore = useRestore(workspaceId);
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
            Everything deleted in the last 30 days, by the team or a client, with what went with it.
            Restore puts it back where it was.
          </p>
        </div>
      </header>
      {restore.isError && <Notice tone="error">{friendlyError(restore.error)}</Notice>}
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
