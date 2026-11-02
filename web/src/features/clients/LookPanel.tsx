import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { COVER_TYPES, prepareCover } from "@/lib/cover";
import { friendlyError } from "@/lib/errors";
import { TEMPLATES, type Template } from "@/lib/wording";
import { useCover, useSaveLook, useTemplates } from "./lookApi";

/** How the client's portal reads and opens: its template (the words on every screen) and, for Cinematic, a cover still. */
export function LookPanel({ clientId, brand }: { clientId: string; brand: string }) {
  const templates = useTemplates();
  const cover = useCover(clientId);
  const save = useSaveLook(clientId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const template: Template = templates.data?.[clientId] ?? "performance";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await save.mutateAsync({ cover: await prepareCover(file) });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="look-panel card">
      <div>
        <h2>Portal template</h2>
        <p className="small muted">
          Sets the words {brand} sees everywhere: reels, hooks and scripts, or films, openings and
          treatments. Switching keeps everything.
        </p>
      </div>
      <div className="template-pick" role="radiogroup" aria-label="Portal template">
        {TEMPLATES.map((option) => (
          <label key={option.id} className={`template-option${template === option.id ? " on" : ""}`}>
            <input
              type="radio"
              name={`template-${clientId}`}
              checked={template === option.id}
              disabled={save.isPending || templates.isPending}
              onChange={() =>
                save.mutate(
                  { template: option.id },
                  { onError: (err) => setError(friendlyError(err)) },
                )
              }
            />
            <strong>{option.label}</strong>
            <span className="small muted">{option.hint}</span>
          </label>
        ))}
      </div>
      {template === "cinematic" && (
        <div className="cover-row">
          <div className={`cover-well${cover.data ? "" : " empty"}`}>
            {cover.data ? (
              <img src={cover.data} alt={`${brand} cover`} />
            ) : (
              <span className="small muted">No cover yet</span>
            )}
          </div>
          <div className="logo-side">
            <strong>Cover still</strong>
            <p className="small muted">
              A wide still from {brand}&rsquo;s own shoot opens their portal, with the logo in white
              over it. Until there is one, the portal opens on black.
            </p>
            <div className="logo-actions">
              <Button
                variant="secondary"
                disabled={busy || cover.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? "Saving…" : cover.data ? "Replace cover" : "Add cover"}
              </Button>
              {cover.data && (
                <Button
                  variant="link"
                  disabled={busy}
                  onClick={() =>
                    save.mutate({ cover: null }, { onError: (err) => setError(friendlyError(err)) })
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {templates.isError && <Notice tone="error">{friendlyError(templates.error)}</Notice>}
      <input
        ref={fileRef}
        type="file"
        accept={COVER_TYPES.join(",")}
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </section>
  );
}
