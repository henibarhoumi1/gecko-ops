import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { CutRow } from "@/features/portal/ReviewTab";
import { CutScreen } from "@/features/review/CutScreen";
import {
  fileSize,
  groupCuts,
  openNotes,
  PREVIEW_LIMIT,
  type Cut,
  type CutStatus,
} from "@/features/review/model";
import { useCutActions, useCuts, type CutTarget } from "@/features/review/reviewApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";

const GROUP: Record<CutStatus, string> = {
  changes: "Client asked for changes",
  draft: "Drafts, only the team sees them",
  review: "With the client",
  approved: "Approved",
};

/** Cuts for one client, from the team's side: upload versions, send them, read the notes, deliver. */
export function TeamReview({ clientId }: { clientId: string }) {
  const workspace = useWorkspace();
  const target = useMemo(() => ({ workspaceId: workspace.id, clientId }), [workspace.id, clientId]);
  const { cutId } = useParams();
  const cuts = useCuts(target);
  const actions = useCutActions(target);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const base = `/clients/${clientId}/review`;

  if (cuts.isPending) return <p className="loading">Loading…</p>;
  if (cuts.isError) return <Notice tone="error">{friendlyError(cuts.error)}</Notice>;

  if (cutId) {
    const cut = cuts.data.cuts.find((c) => c.id === cutId);
    if (!cut)
      return (
        <Notice>
          That cut is gone. <Link to={base}>All cuts</Link>
        </Notice>
      );
    return (
      <TeamScreening
        cut={cut}
        target={target}
        base={base}
        balancePaid={cuts.data.balancePaid}
        canDelete={workspace.role === "founder" || workspace.role === "sales"}
      />
    );
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const id = await actions.save.mutateAsync({ id: null, title: title.trim() });
    setTitle("");
    setAdding(false);
    navigate(`${base}/${id}`);
  }

  const groups = groupCuts(cuts.data.cuts, "team");
  return (
    <section className="tab-body">
      <p className="lede">
        One cut per deliverable. Upload a 720p preview with the watermark burned in (under 50 MB),
        send it, and the client leaves notes on the exact moment. Each new upload is a new version.
      </p>
      {adding ? (
        <form className="inline-form" onSubmit={onAdd}>
          <label className="visually-hidden" htmlFor="cut-title">
            Cut title
          </label>
          <input
            id="cut-title"
            value={title}
            maxLength={160}
            autoFocus
            placeholder="Reel 3, the before and after"
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button type="submit" disabled={actions.save.isPending}>
            Add cut
          </Button>
          <Button variant="link" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button onClick={() => setAdding(true)}>New cut</Button>
      )}
      {actions.save.error && <Notice tone="error">{friendlyError(actions.save.error)}</Notice>}
      {groups.length === 0 && <p className="muted">No cuts yet.</p>}
      {groups.map(([status, items]) => (
        <div key={status} className="group">
          <h2>
            {GROUP[status]} <span className="count">{items.length}</span>
          </h2>
          <ul className="cut-list">
            {items.map((cut) => {
              const open = openNotes(cut);
              return (
                <CutRow
                  key={cut.id}
                  cut={cut}
                  to={`${base}/${cut.id}`}
                  extra={
                    cut.version === 0
                      ? "no preview yet"
                      : open > 0
                        ? `${open} note${open === 1 ? "" : "s"} to handle`
                        : cut.delivered
                          ? "delivered"
                          : undefined
                  }
                />
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function TeamScreening({
  cut,
  target,
  base,
  balancePaid,
  canDelete,
}: {
  cut: Cut;
  target: CutTarget;
  base: string;
  balancePaid: boolean;
  canDelete: boolean;
}) {
  const actions = useCutActions(target);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const failed =
    actions.status.error ?? actions.noteDone.error ?? actions.remove.error ?? actions.note.error;

  return (
    <section className="tab-body">
      <p className="small">
        <Link to={base}>← All cuts</Link>
      </p>
      <h2 className="screen-title" dir="auto">
        {cut.title}
      </h2>
      <p className="small muted">
        {
          {
            draft: "Draft. The client doesn't see it yet.",
            review: "With the client.",
            changes:
              "The client asked for changes. Tick notes off as you handle them, then upload the next version.",
            approved: `Approved V${cut.approvedVersion} by ${cut.approvedBy ?? "the client"}.`,
          }[cut.status]
        }
      </p>
      {failed && <Notice tone="error">{friendlyError(failed)}</Notice>}

      <div className="cut-tools">
        {cut.status !== "approved" && <UploadVersion cut={cut} target={target} />}
        {cut.status === "draft" && cut.version > 0 && (
          <Button
            disabled={actions.status.isPending}
            onClick={() => actions.status.mutate({ id: cut.id, status: "review" })}
          >
            Send V{cut.version} to the client
          </Button>
        )}
        {cut.status === "review" && !cut.notes.some((n) => n.fromClient) && (
          <Button
            variant="link"
            onClick={() => actions.status.mutate({ id: cut.id, status: "draft" })}
          >
            Take it back to drafts
          </Button>
        )}
      </div>

      {cut.status === "approved" && (
        <FinalForm cut={cut} target={target} balancePaid={balancePaid} />
      )}

      <CutScreen
        cut={cut}
        reader="team"
        onNote={({ at, body }) => actions.note.mutateAsync({ id: cut.id, at, body })}
        onDone={(note, done) => actions.noteDone.mutate({ note: note.id, done })}
      />

      {canDelete && (
        <p className="small cut-delete">
          {deleting ? (
            <>
              Delete “{cut.title}” and its {cut.versions.length} preview
              {cut.versions.length === 1 ? "" : "s"} for both sides?{" "}
              <Button
                variant="link"
                className="danger"
                disabled={actions.remove.isPending}
                onClick={async () => {
                  await actions.remove.mutateAsync({
                    id: cut.id,
                    paths: cut.versions.map((v) => v.path),
                  });
                  navigate(base);
                }}
              >
                Yes, delete it
              </Button>{" "}
              <Button variant="link" onClick={() => setDeleting(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <Button variant="link" onClick={() => setDeleting(true)}>
              Delete this cut
            </Button>
          )}
        </p>
      )}
    </section>
  );
}

function UploadVersion({ cut, target }: { cut: Cut; target: CutTarget }) {
  const actions = useCutActions(target);
  const [file, setFile] = useState<File | null>(null);
  const [whatChanged, setWhatChanged] = useState("");
  const [open, setOpen] = useState(cut.version === 0);
  const tooBig = file != null && file.size > PREVIEW_LIMIT;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || tooBig) return;
    await actions.upload.mutateAsync({ id: cut.id, version: cut.version, file, whatChanged });
    setFile(null);
    setWhatChanged("");
    setOpen(false);
  }

  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Upload V{cut.version + 1}
      </Button>
    );

  return (
    <form className="upload-version card" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="cut-file">
          Preview V{cut.version + 1} (MP4, 720p, watermark burned in)
        </label>
        <input
          id="cut-file"
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <span className={`small${tooBig ? " error-text" : " muted"}`}>
            {fileSize(file.size)}
            {tooBig && ": over 50 MB. Export at 720p with a lower bitrate."}
          </span>
        )}
      </div>
      {cut.version > 0 && (
        <div className="field">
          <label htmlFor="cut-changed">What changed (the client reads this)</label>
          <input
            id="cut-changed"
            value={whatChanged}
            maxLength={500}
            placeholder="Bigger logo at 0:12, new music"
            onChange={(e) => setWhatChanged(e.target.value)}
          />
        </div>
      )}
      <div className="screen-form-row">
        <Button type="submit" disabled={!file || tooBig || actions.upload.isPending}>
          {actions.upload.isPending ? "Uploading…" : "Upload"}
        </Button>
        {cut.version > 0 && (
          <Button variant="link" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        )}
      </div>
      {cut.status !== "draft" && (
        <p className="small muted">
          The client sees the new version straight away and approves it again.
        </p>
      )}
      {actions.upload.error && <Notice tone="error">{friendlyError(actions.upload.error)}</Notice>}
    </form>
  );
}

function FinalForm({
  cut,
  target,
  balancePaid,
}: {
  cut: Cut;
  target: CutTarget;
  balancePaid: boolean;
}) {
  const actions = useCutActions(target);
  const [link, setLink] = useState(cut.finalLink ?? "");
  const [note, setNote] = useState(cut.finalNote);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await actions.final.mutateAsync({ id: cut.id, link, note });
    setSaved(true);
  }

  return (
    <form className="final-form card" onSubmit={onSubmit}>
      <h3>Final file</h3>
      <p className="small muted">
        Paste the Google Drive link to the clean file, shared as “anyone with the link”.{" "}
        {balancePaid
          ? "The balance is paid, so the client can open it as soon as you save."
          : "The balance isn't marked paid, so the client sees it's ready but can't open it yet. Mark it paid in Overview."}
      </p>
      <div className="field">
        <label htmlFor="final-link">Link</label>
        <input
          id="final-link"
          type="url"
          value={link}
          placeholder="https://drive.google.com/…"
          onChange={(e) => setLink(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="final-note">Note for the client (optional)</label>
        <input
          id="final-note"
          value={note}
          maxLength={500}
          placeholder="4K, 9:16, with and without subtitles"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="screen-form-row">
        <Button type="submit" disabled={actions.final.isPending}>
          {cut.finalLink ? "Save" : "Deliver"}
        </Button>
        {saved && <span className="small muted">Saved.</span>}
      </div>
      {actions.final.error && <Notice tone="error">{friendlyError(actions.final.error)}</Notice>}
    </form>
  );
}
