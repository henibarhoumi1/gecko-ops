import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import { useConcepts } from "@/features/clients/clientsApi";
import { friendlyError } from "@/lib/errors";
import { downloadFinal, PREVIEW_LIMIT, uploadFinal, uploadPreview } from "./media";
import { groupVideos, type Video } from "./model";
import { VideoCard } from "./VideoCard";
import {
  useAddVideoNote,
  useDeleteVideo,
  useRefreshVideos,
  useSaveVideo,
  useSetVideoStatus,
  useVideos,
} from "./videosApi";

/** The team uploads cuts, shares them with the client, and attaches the clean finals. */
export function TeamVideos({ clientId }: { clientId: string }) {
  const videos = useVideos(clientId);
  const [adding, setAdding] = useState(false);

  if (videos.isPending) return <p className="muted">Loading videos…</p>;
  if (videos.isError) return <Notice tone="error">{friendlyError(videos.error)}</Notice>;
  const groups = groupVideos(videos.data, "team");
  const nextPosition = videos.data.reduce((max, v) => Math.max(max, v.position + 1), 0);

  return (
    <section className="tab-body">
      <div className="page-head">
        <p className="lede">
          Upload a cut and the client watches it with the Gecko watermark, then approves it or asks
          for changes. The clean final unlocks for them once the balance is marked paid.
        </p>
        {!adding && <Button onClick={() => setAdding(true)}>New video</Button>}
      </div>
      {adding && (
        <VideoForm clientId={clientId} position={nextPosition} onDone={() => setAdding(false)} />
      )}
      {groups.length === 0 && !adding && <p className="muted">No videos yet.</p>}
      {groups.map((group) => (
        <div key={group.status} className="group">
          <h2>
            {group.title} <span className="count">{group.items.length}</span>
          </h2>
          <div className="concepts">
            {group.items.map((video) => (
              <TeamVideo key={video.id} clientId={clientId} video={video} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

type Mode = "idle" | "edit" | "comment" | "delete";
type Upload = { kind: "preview" | "final"; share: number } | null;

function TeamVideo({ clientId, video }: { clientId: string; video: Video }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [upload, setUpload] = useState<Upload>(null);
  const [error, setError] = useState("");
  const status = useSetVideoStatus(clientId);
  const remove = useDeleteVideo(clientId);
  const note = useAddVideoNote(clientId);
  const refresh = useRefreshVideos(clientId);
  useLeaveWarning(upload != null);

  const run = (action: Promise<unknown>) =>
    action.then(
      () => setMode("idle"),
      (e: unknown) => setError(friendlyError(e)),
    );

  async function send(kind: "preview" | "final", file: File) {
    setError("");
    if (kind === "preview" && file.size > PREVIEW_LIMIT)
      return setError(friendlyError("preview_too_big"));
    setUpload({ kind, share: 0 });
    try {
      const onProgress = (share: number) => setUpload({ kind, share: Math.min(share, 1) });
      await (kind === "preview" ? uploadPreview : uploadFinal)(video.id, file, onProgress);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setUpload(null);
      void refresh();
    }
  }

  if (mode === "edit")
    return <VideoForm clientId={clientId} video={video} onDone={() => setMode("idle")} />;

  const busy = upload != null;
  const shared = video.status !== "draft";

  return (
    <VideoCard video={video} reader="team">
      {upload ? (
        <Progress
          label={upload.kind === "preview" ? "Uploading the cut" : "Uploading the final file"}
          share={upload.share}
        />
      ) : (
        <div className="video-files">
          <FileButton
            label={video.hasPreview ? "Upload a new cut" : "Upload the cut"}
            accept="video/*"
            onFile={(file) => void send("preview", file)}
          />
          <FileButton
            label={video.hasFinal ? "Replace the final file" : "Upload the final file"}
            variant="secondary"
            onFile={(file) => void send("final", file)}
          />
          {video.hasFinal && (
            <Button
              variant="link"
              onClick={() =>
                downloadFinal(video.id).catch((e: unknown) => setError(friendlyError(e)))
              }
            >
              Download the final
            </Button>
          )}
        </div>
      )}
      {video.hasPreview && shared && !busy && (
        <p className="small muted">A new cut is a new version: the client approves it again.</p>
      )}
      {mode === "idle" && !busy && (
        <div className="concept-actions">
          {video.status === "draft" && video.hasPreview && (
            <Button
              disabled={status.isPending}
              onClick={() => void run(status.mutateAsync({ id: video.id, status: "review" }))}
            >
              Share with the client
            </Button>
          )}
          <Button variant="secondary" onClick={() => setMode("edit")}>
            Rename
          </Button>
          <Button variant="link" onClick={() => setMode("comment")}>
            Comment
          </Button>
          {video.status === "review" && (
            <Button
              variant="link"
              disabled={status.isPending}
              onClick={() => void run(status.mutateAsync({ id: video.id, status: "draft" }))}
            >
              Take back to draft
            </Button>
          )}
          <Button variant="link" onClick={() => setMode("delete")}>
            Delete
          </Button>
        </div>
      )}
      {mode === "delete" && (
        <div className="concept-form">
          <p className="small">
            Delete "{video.title}", its preview, its final file and its conversation? This can't be
            undone.
          </p>
          <div className="actions">
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Keep it
            </Button>
            <Button
              disabled={remove.isPending}
              onClick={() => void run(remove.mutateAsync(video.id))}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
      {mode === "comment" && (
        <form
          className="concept-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
            if (!body) return setError("Write a comment first.");
            void run(note.mutateAsync({ videoId: video.id, body }));
          }}
        >
          <TextArea
            label={
              shared
                ? "Comment (the client sees it)"
                : "Comment (the client sees it once you share)"
            }
            name="body"
            rows={3}
            maxLength={4000}
            autoFocus
          />
          <div className="actions">
            <Button variant="secondary" onClick={() => setMode("idle")}>
              Cancel
            </Button>
            <Button type="submit" disabled={note.isPending}>
              Send
            </Button>
          </div>
        </form>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </VideoCard>
  );
}

function VideoForm({
  clientId,
  video,
  position,
  onDone,
}: {
  clientId: string;
  video?: Video;
  position?: number;
  onDone: () => void;
}) {
  const save = useSaveVideo(clientId);
  const concepts = useConcepts(clientId);
  const [error, setError] = useState("");
  const options: [string, string][] = [
    ["", "None"],
    ...(concepts.data ?? []).map((c): [string, string] => [c.id, c.title]),
  ];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return setError("Give the video a title.");
    try {
      await save.mutateAsync({
        id: video?.id ?? null,
        title,
        conceptId: String(form.get("concept") ?? "") || null,
        position,
      });
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="card stack concept-edit" onSubmit={onSubmit}>
      <h3>{video ? `Rename "${video.title}"` : "New video"}</h3>
      <div className="row">
        <Field
          label="Title"
          name="title"
          defaultValue={video?.title}
          maxLength={160}
          placeholder="Reel 1: the spill"
          autoFocus
          required
        />
        <Select
          label="Concept"
          name="concept"
          defaultValue={video?.conceptId ?? ""}
          options={options}
        />
      </div>
      {!video && (
        <p className="small muted">
          It starts as a draft. Upload the cut on the next step, then share it.
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {video ? "Save" : "Add video"}
        </Button>
      </div>
    </form>
  );
}

/** A button that opens the file picker. */
function FileButton({
  label,
  accept,
  variant = "primary",
  onFile,
}: {
  label: string;
  accept?: string;
  variant?: "primary" | "secondary";
  onFile: (file: File) => void;
}) {
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  }
  return (
    <label className={`btn btn-${variant} file-btn`}>
      {label}
      <input type="file" accept={accept} onChange={onChange} />
    </label>
  );
}

function Progress({ label, share }: { label: string; share: number }) {
  const percent = Math.round(share * 100);
  return (
    <div className="upload" role="status">
      <p className="small">
        {label}… {percent}%. Keep this tab open.
      </p>
      <progress max={100} value={percent} aria-label={label} />
    </div>
  );
}

/** Asks before closing the tab while a file is still uploading. */
function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
