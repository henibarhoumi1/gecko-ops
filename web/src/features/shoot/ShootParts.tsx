import { useState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import { friendlyError } from "@/lib/errors";
import {
  PERSON_SIDES,
  sideName,
  type PlanScript,
  type ShootDay,
  type ShootPerson,
  type ShootReel,
} from "./model";
import type { DayInput, PersonInput, useShootActions } from "./shootApi";

type Actions = ReturnType<typeof useShootActions>;

export function blankDay(day: string, projectId: string | null = null): DayInput {
  return {
    id: null,
    projectId,
    day,
    title: "",
    callTime: "",
    wrapTime: "",
    place: "",
    address: "",
    mapLink: "",
    notes: "",
    privateNotes: "",
  };
}

export function dayInput(d: ShootDay): DayInput {
  return {
    id: d.id,
    day: d.day,
    title: d.title,
    callTime: d.callTime ?? "",
    wrapTime: d.wrapTime ?? "",
    place: d.place,
    address: d.address,
    mapLink: d.mapLink,
    notes: d.notes,
    privateNotes: d.privateNotes ?? "",
  };
}

/** The plan of the day: when, where, and the brief everyone reads. Founder and producers only. */
export function DayForm({
  initial,
  actions,
  onSaved,
  onCancel,
}: {
  initial: DayInput;
  actions: Actions;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (key: keyof DayInput) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });
  return (
    <form
      className="card shoot-form"
      onSubmit={(e) => {
        e.preventDefault();
        actions.saveDay.mutate(form, { onSuccess: onSaved });
      }}
    >
      <h2>{form.id ? "Edit the day" : "New shoot day"}</h2>
      <div className="row">
        <Field label="Date" type="date" required value={form.day} onChange={set("day")} />
        <Field
          label="Name"
          value={form.title}
          onChange={set("title")}
          maxLength={80}
          placeholder="Day 1, kitchen batch…"
        />
        <Field label="Call time" type="time" value={form.callTime} onChange={set("callTime")} />
        <Field label="Wrap" type="time" value={form.wrapTime} onChange={set("wrapTime")} />
      </div>
      <div className="row">
        <Field
          label="Place"
          value={form.place}
          onChange={set("place")}
          maxLength={160}
          placeholder="Studio, the client's shop…"
        />
        <Field label="Address" value={form.address} onChange={set("address")} maxLength={300} />
        <Field
          label="Map link"
          type="url"
          value={form.mapLink}
          onChange={set("mapLink")}
          maxLength={1000}
          placeholder="https://maps.app.goo.gl/…"
        />
      </div>
      <TextArea
        label="Brief for everyone: set design, what to bring, parking"
        value={form.notes}
        onChange={set("notes")}
        maxLength={4000}
        rows={4}
      />
      <TextArea
        label="Only Gecko sees this: rates, contacts"
        value={form.privateNotes}
        onChange={set("privateNotes")}
        maxLength={2000}
        rows={2}
      />
      {actions.saveDay.isError && (
        <Notice tone="error">{friendlyError(actions.saveDay.error)}</Notice>
      )}
      <div className="actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={actions.saveDay.isPending || !form.day}>
          {actions.saveDay.isPending ? "Saving…" : "Save the day"}
        </Button>
      </div>
    </form>
  );
}

/** Which scripts are shot that day, in order. A reel already shot stays on. */
export function ReelPicker({
  dayId,
  reels,
  scripts,
  actions,
  onDone,
}: {
  dayId: string;
  reels: ShootReel[];
  scripts: PlanScript[];
  actions: Actions;
  onDone: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(() => reels.map((r) => r.scriptId));
  const shot = new Set(reels.filter((r) => r.status === "done").map((r) => r.scriptId));
  const toggle = (id: string) =>
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  return (
    <div className="card shoot-form">
      <h2>Reels on this day</h2>
      <p className="small">
        Tick the scripts to shoot. They join the list in the order you tick them; reorder them
        afterwards with the arrows.
      </p>
      {scripts.length === 0 ? (
        <p className="empty-state">No scripts yet. Write them first, then put them on a day.</p>
      ) : (
        <ul className="shoot-pick">
          {scripts.map((s) => {
            const at = picked.indexOf(s.id);
            return (
              <li key={s.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={at >= 0}
                    disabled={shot.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <span className="shoot-pick-n">{at >= 0 ? at + 1 : ""}</span>
                  <span dir="auto">{s.title}</span>
                  <span className="small">
                    {s.status === "approved"
                      ? "approved"
                      : s.status === "draft"
                        ? "draft, the client can't read it yet"
                        : "with the client"}
                    {shot.has(s.id) ? " · shot" : ""}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {actions.setReels.isError && (
        <Notice tone="error">{friendlyError(actions.setReels.error)}</Notice>
      )}
      <div className="actions">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={actions.setReels.isPending}
          onClick={() =>
            actions.setReels.mutate({ dayId, scriptIds: picked }, { onSuccess: () => onDone() })
          }
        >
          {actions.setReels.isPending ? "Saving…" : `Save ${picked.length} reels`}
        </Button>
      </div>
    </div>
  );
}

const blankPerson = (): PersonInput => ({
  id: null,
  name: "",
  role: "",
  side: "crew",
  callTime: "",
  phone: "",
});

export function PersonForm({
  dayId,
  person,
  actions,
  onDone,
}: {
  dayId: string;
  person: ShootPerson | null;
  actions: Actions;
  onDone: () => void;
}) {
  const [form, setForm] = useState<PersonInput>(() =>
    person
      ? {
          id: person.id,
          name: person.name,
          role: person.role,
          side: person.side,
          callTime: person.callTime ?? "",
          phone: person.phone ?? "",
        }
      : blankPerson(),
  );
  return (
    <form
      className="shoot-person-form"
      onSubmit={(e) => {
        e.preventDefault();
        actions.savePerson.mutate({ dayId, person: form }, { onSuccess: () => onDone() });
      }}
    >
      <div className="row">
        <Field
          label="Name"
          required
          value={form.name}
          maxLength={120}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Field
          label="Role"
          value={form.role}
          maxLength={80}
          placeholder="DOP, talent, assistant…"
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
        <Select
          label="Side"
          value={form.side}
          options={PERSON_SIDES.map((s) => [s, sideName(s)] as const)}
          onChange={(e) => setForm({ ...form, side: e.target.value as PersonInput["side"] })}
        />
        <Field
          label="Call time"
          type="time"
          value={form.callTime}
          onChange={(e) => setForm({ ...form, callTime: e.target.value })}
        />
        <Field
          label="Phone (team only)"
          type="tel"
          value={form.phone}
          maxLength={40}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      {actions.savePerson.isError && (
        <Notice tone="error">{friendlyError(actions.savePerson.error)}</Notice>
      )}
      <div className="actions">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={actions.savePerson.isPending || !form.name.trim()}>
          {person ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}

/** A note that saves when you leave the field, so typing on set never waits for the network. */
export function NoteField({
  label,
  value,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  // A newer note from someone else replaces the draft, unless this person is typing a different one.
  if (value !== seen) {
    setSeen(value);
    if (draft === seen) setDraft(value);
  }
  return (
    <TextArea
      label={label}
      value={draft}
      rows={2}
      maxLength={2000}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== value.trim()) onSave(draft);
      }}
    />
  );
}
