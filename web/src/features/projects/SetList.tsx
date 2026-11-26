import { useMemo, useState, type FormEvent } from "react";
import { GoArrow } from "@/components/GoArrow";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { useImageUrl } from "@/features/board/boardApi";
import { PhotoPicker } from "@/features/production/ProductionParts";
import { PHOTO_BUCKET, useTeamProduction } from "@/features/production/productionApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { ChoicePhoto } from "@/features/writing/ShootPanel";
import { friendlyError } from "@/lib/errors";
import { setsForProject, useCurrentProject, useProjectSets, useSetActions } from "./setsApi";
import type { ProjectSet } from "./setsModel";

/**
 * The set list of the campaign on screen, as cards with their photos: add the sets once, then each idea and script
 * picks one or more of them beside its words. Both sides see the same cards. Order is the order they get shot in.
 */
export function SetList({ clientId }: { clientId: string }) {
  const project = useCurrentProject(clientId);
  const all = useProjectSets(clientId);
  const act = useSetActions(clientId);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const sets = setsForProject(all.data ?? [], project.id);
  const run = (p: Promise<unknown>) => p.catch((e: unknown) => setError(friendlyError(e)));

  function move(i: number, by: -1 | 1) {
    const a = sets[i];
    const b = sets[i + by];
    if (!a || !b) return;
    void run(
      Promise.all([
        act.update.mutateAsync({ id: a.id, position: b.position }),
        act.update.mutateAsync({
          id: b.id,
          position: a.position === b.position ? a.position + by : a.position,
        }),
      ]),
    );
  }

  return (
    <div className="group set-list">
      <div className="group-head set-list-head">
        <h2>
          Sets{project.name ? ` · ${project.name}` : ""}{" "}
          <span className="count">{sets.length}</span>
        </h2>
        {!adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Add a set
          </Button>
        )}
      </div>
      <p className="small muted set-list-lede">
        The setups this campaign is shot on, with photos. Every idea and script picks one or more of
        them beside its words, and the client sees the same cards.
      </p>
      {all.isError && <Notice tone="error">{friendlyError(all.error)}</Notice>}
      {adding && (
        <SetForm
          clientId={clientId}
          onCancel={() => setAdding(false)}
          onSave={(fields) =>
            act.add
              .mutateAsync({
                ...fields,
                projectId: project.id,
                position: (sets.at(-1)?.position ?? 0) + 1,
              })
              .then(() => setAdding(false))
          }
          busy={act.add.isPending}
        />
      )}
      {sets.length > 0 ? (
        <ol className="set-cards">
          {sets.map((s, i) =>
            editing === s.id ? (
              <li key={s.id} className="set-card is-editing">
                <SetForm
                  clientId={clientId}
                  set={s}
                  onCancel={() => setEditing(null)}
                  onSave={(fields) =>
                    act.update.mutateAsync({ id: s.id, ...fields }).then(() => setEditing(null))
                  }
                  busy={act.update.isPending}
                />
              </li>
            ) : (
              <li key={s.id} className="set-card">
                <span className="set-cover">
                  <ChoicePhoto path={s.photos[0]} name={s.name} />
                  <span className="set-order">{i + 1}</span>
                  {s.photos.length > 1 && <span className="set-more">+{s.photos.length - 1}</span>}
                </span>
                <span className="set-body">
                  <strong dir="auto">{s.name}</strong>
                  {s.notes && (
                    <span className="set-notes" dir="auto">
                      {s.notes}
                    </span>
                  )}
                </span>
                <span className="set-tools">
                  <Button variant="link" onClick={() => setEditing(s.id)}>
                    Edit
                  </Button>
                  <Button
                    variant="link"
                    aria-label={`Move ${s.name} earlier`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <GoArrow back />
                  </Button>
                  <Button
                    variant="link"
                    aria-label={`Move ${s.name} later`}
                    disabled={i === sets.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <GoArrow />
                  </Button>
                  <Button
                    variant="link"
                    disabled={act.remove.isPending}
                    onClick={() => void run(act.remove.mutateAsync(s.id))}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ),
          )}
        </ol>
      ) : (
        !adding && (
          <p className="set-empty">
            No sets yet. Add the kitchen counter, the bathroom mirror, the sofa: each setup you'll
            film on.
          </p>
        )
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

function SetForm({
  clientId,
  set,
  onSave,
  onCancel,
  busy,
}: {
  clientId: string;
  set?: ProjectSet;
  onSave: (fields: { name: string; notes: string; photos: string[] }) => Promise<unknown>;
  onCancel: () => void;
  busy: boolean;
}) {
  const { id: workspaceId } = useWorkspace();
  const target = useMemo(() => ({ workspaceId, clientId }), [workspaceId, clientId]);
  const production = useTeamProduction(target);
  const [photos, setPhotos] = useState<string[]>(set?.photos ?? []);
  const [error, setError] = useState("");
  // The location's photos, one click from becoming the set's.
  const fromPlaces = (production.data?.options ?? [])
    .filter((o) => o.kind === "location")
    .flatMap((o) => o.photos)
    .filter((p) => !photos.includes(p));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const d = new FormData(event.currentTarget);
    const name = String(d.get("name") ?? "").trim();
    if (!name) return setError("Give the set a name.");
    setError("");
    try {
      await onSave({ name, notes: String(d.get("notes") ?? ""), photos });
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="set-form" onSubmit={(e) => void onSubmit(e)}>
      <div className="set-form-fields">
        <Field
          label="Set"
          name="name"
          defaultValue={set?.name}
          maxLength={120}
          placeholder="Kitchen counter"
          autoFocus
          required
        />
        <Field
          label="Notes"
          name="notes"
          defaultValue={set?.notes}
          maxLength={1000}
          placeholder="Morning light, wooden counter, the stools"
        />
      </div>
      <PhotoPicker
        target={target}
        value={photos}
        onChange={setPhotos}
        label="Photos"
        addLabel="+ Add photos"
      />
      {fromPlaces.length > 0 && photos.length < 6 && (
        <div className="set-from-place">
          <span className="small">From the location</span>
          <div className="set-from-place-row">
            {fromPlaces.slice(0, 12).map((p) => (
              <PlacePhoto key={p} path={p} onPick={() => setPhotos([...photos, p].slice(0, 6))} />
            ))}
          </div>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="concept-actions">
        <Button type="submit" disabled={busy}>
          {set ? "Save" : "Add set"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PlacePhoto({ path, onPick }: { path: string; onPick: () => void }) {
  const url = useImageUrl(path, PHOTO_BUCKET);
  return (
    <button type="button" className="set-place-photo" onClick={onPick} aria-label="Use this photo">
      {url.data && <img src={url.data} alt="" loading="lazy" />}
      <span aria-hidden="true">+</span>
    </button>
  );
}
