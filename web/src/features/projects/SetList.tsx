import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { setsForProject, useCurrentProject, useProjectSets, useSetActions } from "./setsApi";

/**
 * The set list of the campaign on screen: add the sets once, then each script (one video) picks one in its shoot
 * plan. Order is the order they get shot in.
 */
export function SetList({ clientId }: { clientId: string }) {
  const project = useCurrentProject(clientId);
  const all = useProjectSets(clientId);
  const act = useSetActions(clientId);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const sets = setsForProject(all.data ?? [], project.id);
  const run = (p: Promise<unknown>) => p.catch((e: unknown) => setError(friendlyError(e)));

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("set-name") ?? "").trim();
    if (!name) return;
    setError("");
    try {
      await act.add.mutateAsync({
        name,
        notes: String(data.get("set-notes") ?? ""),
        projectId: project.id,
        position: (sets.at(-1)?.position ?? 0) + 1,
      });
      form.reset();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

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
      <div className="group-head">
        <h2>
          Sets{project.name ? ` · ${project.name}` : ""}{" "}
          <span className="count">{sets.length}</span>
        </h2>
      </div>
      <p className="small muted">
        The setups this campaign is shot on, like "kitchen counter" or "bathroom mirror". Each
        script picks one in its shoot plan.
      </p>
      {all.isError && <Notice tone="error">{friendlyError(all.error)}</Notice>}
      {sets.length > 0 && (
        <ol className="set-rows">
          {sets.map((s, i) =>
            editing === s.id ? (
              <li key={s.id}>
                <form
                  className="set-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    void run(
                      act.update
                        .mutateAsync({
                          id: s.id,
                          name: String(d.get("name") ?? s.name),
                          notes: String(d.get("notes") ?? ""),
                        })
                        .then(() => setEditing(null)),
                    );
                  }}
                >
                  <Field label="Set" name="name" defaultValue={s.name} maxLength={120} required />
                  <Field label="Notes" name="notes" defaultValue={s.notes} maxLength={1000} />
                  <div className="concept-actions">
                    <Button type="submit" disabled={act.update.isPending}>
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={s.id} className="set-row">
                <span className="set-n">{i + 1}</span>
                <span className="set-what">
                  <strong dir="auto">{s.name}</strong>
                  {s.notes && (
                    <span className="small muted" dir="auto">
                      {" "}
                      · {s.notes}
                    </span>
                  )}
                </span>
                <span className="set-tools">
                  <Button
                    variant="link"
                    aria-label={`Move ${s.name} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="link"
                    aria-label={`Move ${s.name} down`}
                    disabled={i === sets.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </Button>
                  <Button variant="link" onClick={() => setEditing(s.id)}>
                    Edit
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
      )}
      <form className="set-add" onSubmit={(e) => void onAdd(e)}>
        <Field
          label="New set"
          name="set-name"
          maxLength={120}
          placeholder="Kitchen counter"
          required
        />
        <Field
          label="Notes (optional)"
          name="set-notes"
          maxLength={1000}
          placeholder="Morning light, white tiles"
        />
        <Button type="submit" disabled={act.add.isPending}>
          Add set
        </Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
