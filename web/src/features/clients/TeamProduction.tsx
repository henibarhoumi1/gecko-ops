import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import {
  BudgetMeter,
  CommentBox,
  OptionCard,
  PhotoPicker,
} from "@/features/production/ProductionParts";
import {
  isCommitted,
  STEPS,
  statusName,
  type Budget,
  type OptionKind,
  type OptionStatus,
  type ProductionOption,
} from "@/features/production/model";
import {
  useTeamProduction,
  useTeamProductionActions,
  type OptionDraft,
  type ProductionTarget,
} from "@/features/production/productionApi";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";

const KINDS: { kind: OptionKind; title: string; add: string; empty: string }[] = [
  {
    kind: "talent",
    title: "Talent",
    add: "Add talent",
    empty:
      "No talent proposed yet. Add a profile with photos, fee and usage, and the client approves it.",
  },
  {
    kind: "location",
    title: "Locations",
    add: "Add a location",
    empty: "No locations yet. Add one with photos, cost and what's included.",
  },
  {
    kind: "prop",
    title: "Props",
    add: "Add a prop",
    empty: "No props yet. List what Gecko buys and what the client brings.",
  },
];

/** Talent, locations, props and the budget, from the team's side. */
export function TeamProduction({ clientId }: { clientId: string }) {
  const { id: workspaceId } = useWorkspace();
  const target = useMemo(() => ({ workspaceId, clientId }), [workspaceId, clientId]);
  const page = useTeamProduction(target);
  const [adding, setAdding] = useState<OptionKind | null>(null);
  if (page.isPending) return <p className="muted">Loading…</p>;
  if (page.isError) return <Notice tone="error">{friendlyError(page.error)}</Notice>;
  const { budget, options } = page.data;

  return (
    <section className="tab-body production">
      <p className="lede">
        Propose talent, locations and props with their cost. The client approves each against the
        budget; anything over it needs their owner or finance. Book only what's approved, then mark
        it shot and paid so it lands on the balance invoice.
      </p>
      <BudgetEditor target={target} budget={budget} />
      {budget && <BudgetMeter budget={budget} options={options} reader="team" />}
      {KINDS.map((k) => {
        const list = options.filter((o) => o.kind === k.kind);
        return (
          <div key={k.kind} className="group">
            <div className="group-head">
              <h2>
                {k.title} <span className="count">{list.length}</span>
              </h2>
              {adding !== k.kind && (
                <Button variant="secondary" onClick={() => setAdding(k.kind)}>
                  {k.add}
                </Button>
              )}
            </div>
            {adding === k.kind && (
              <OptionForm target={target} kind={k.kind} onDone={() => setAdding(null)} />
            )}
            {list.length === 0 && adding !== k.kind && <p className="muted">{k.empty}</p>}
            <div className="prod-grid">
              {list.map((o) => (
                <TeamOption key={o.id} target={target} option={o} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function BudgetEditor({ target, budget }: { target: ProductionTarget; budget: Budget | null }) {
  const act = useTeamProductionActions(target);
  const [open, setOpen] = useState(!budget || budget.cap == null);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw = String(form.get("cap") ?? "").trim();
    const cap = raw === "" ? null : Number(raw.replace(",", "."));
    if (cap != null && (!Number.isFinite(cap) || cap < 0))
      return setError("Enter the budget as a number of dinars.");
    try {
      await act.saveBudget.mutateAsync({ cap, note: String(form.get("note") ?? "") });
      setOpen(false);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  if (!open)
    return (
      <p className="small">
        <Button variant="link" onClick={() => setOpen(true)}>
          Edit the budget
        </Button>
      </p>
    );
  return (
    <form className="card budget-form" onSubmit={onSubmit}>
      <h3>Production budget</h3>
      <div className="row">
        <Field
          label="Cap in DT (talent, locations and props Gecko pays)"
          name="cap"
          inputMode="decimal"
          defaultValue={budget?.cap ?? ""}
          placeholder="1300"
        />
        <Field
          label="Note for the client (optional)"
          name="note"
          maxLength={500}
          defaultValue={budget?.note ?? ""}
          placeholder="Covers talent and the Airbnb"
        />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        {budget && (
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={act.saveBudget.isPending}>
          Save budget
        </Button>
      </div>
    </form>
  );
}

function TeamOption({ target, option }: { target: ProductionTarget; option: ProductionOption }) {
  const act = useTeamProductionActions(target);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  if (editing)
    return (
      <OptionForm
        target={target}
        kind={option.kind}
        option={option}
        onDone={() => setEditing(false)}
      />
    );
  const run = (p: Promise<unknown>) => p.catch((e: unknown) => setError(friendlyError(e)));
  const steps = option.boughtBy === "client" ? STEPS.slice(0, 3) : STEPS;

  return (
    <OptionCard
      option={option}
      reader="team"
      extra={
        (option.privateNotes || option.kind === "talent") && (
          <p className="small team-only">
            <span className="muted">Team only · </span>
            {option.kind === "talent" &&
              (option.releaseOnFile ? "Release on file. " : "No release yet. ")}
            {option.privateNotes}
          </p>
        )
      }
    >
      <div className="concept-actions">
        {isCommitted(option) && (
          <Select
            label="Status"
            value={option.status}
            options={steps.map((s) => [s, statusName(s, "team")] as const)}
            onChange={(e) =>
              void run(
                act.setStatus.mutateAsync({
                  id: option.id,
                  status: e.target.value as OptionStatus,
                }),
              )
            }
          />
        )}
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {option.status === "suggested" ? "Price it and propose" : "Edit"}
        </Button>
        {!isCommitted(option) && (
          <Button
            variant="link"
            disabled={act.remove.isPending}
            onClick={() => void run(act.remove.mutateAsync(option.id))}
          >
            Withdraw
          </Button>
        )}
        <CommentBox onSend={(body) => act.note.mutateAsync({ id: option.id, body })} />
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </OptionCard>
  );
}

function OptionForm({
  target,
  kind,
  option,
  onDone,
}: {
  target: ProductionTarget;
  kind: OptionKind;
  option?: ProductionOption;
  onDone: () => void;
}) {
  const act = useTeamProductionActions(target);
  const [photos, setPhotos] = useState<string[]>(option?.photos ?? []);
  const [error, setError] = useState("");
  const committed = option ? isCommitted(option) : false;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const cost = Number(text("cost").replace(",", ".") || "0");
    if (!text("name")) return setError("Give it a name.");
    if (!Number.isFinite(cost) || cost < 0)
      return setError("Enter the cost as a number of dinars.");
    const draft: OptionDraft = {
      id: option?.id,
      kind,
      name: text("name"),
      role: text("role"),
      details: text("details"),
      link: text("link"),
      photos,
      cost,
      costNote: text("costNote"),
      when: text("when"),
      usage: text("usage"),
      boughtBy: (text("boughtBy") || "gecko") as "gecko" | "client",
      privateNotes: text("privateNotes"),
      releaseOnFile: form.get("releaseOnFile") === "on",
    };
    try {
      await act.save.mutateAsync(draft);
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="concept-form card prod-form" onSubmit={onSubmit}>
      <h3>
        {option
          ? `Edit ${option.name}`
          : kind === "talent"
            ? "New talent"
            : kind === "location"
              ? "New location"
              : "New prop"}
      </h3>
      <div className="row">
        <Field
          label={kind === "talent" ? "First name" : kind === "location" ? "Name" : "Item"}
          name="name"
          maxLength={120}
          defaultValue={option?.name}
          autoFocus
        />
        {kind === "talent" && (
          <Select
            label="Role"
            name="role"
            defaultValue={option?.role || "main"}
            options={[
              ["main", "Main"],
              ["extra", "Extra"],
              ["voice", "Voice"],
            ]}
          />
        )}
        {kind === "location" && (
          <Field
            label="Area"
            name="role"
            maxLength={80}
            defaultValue={option?.role}
            placeholder="La Marsa"
          />
        )}
        {kind === "prop" && (
          <Select
            label="Who brings it"
            name="boughtBy"
            defaultValue={option?.boughtBy ?? "gecko"}
            options={[
              ["gecko", "Gecko buys it"],
              ["client", "The client brings it"],
            ]}
          />
        )}
      </div>
      <div className="row">
        <Field
          label="Cost in DT"
          name="cost"
          inputMode="decimal"
          defaultValue={option?.cost ?? ""}
          placeholder="0"
        />
        <Field
          label={kind === "location" ? "How it's priced" : "Cost note"}
          name="costNote"
          maxLength={160}
          defaultValue={option?.costNote}
          placeholder={kind === "location" ? "350 DT a day, 1 day" : "Half day"}
        />
      </div>
      {committed && (
        <p className="small muted">Changing the cost sends it back to the client for a new yes.</p>
      )}
      {kind !== "prop" && (
        <Field
          label={kind === "talent" ? "Availability on the shoot date" : "Time slot"}
          name="when"
          maxLength={160}
          defaultValue={option?.when}
          placeholder={kind === "talent" ? "Free on 12 Nov" : "12 Nov, 8:00 to 18:00"}
        />
      )}
      {kind !== "prop" && (
        <Field
          label={kind === "talent" ? "Instagram or portfolio link" : "Listing link"}
          name="link"
          type="url"
          maxLength={1000}
          defaultValue={option?.link}
          placeholder="https://"
        />
      )}
      <TextArea
        label={
          kind === "talent"
            ? "About them (look, experience)"
            : kind === "location"
              ? "What's included and house rules (furniture, light, power, parking)"
              : "Details"
        }
        name="details"
        rows={3}
        maxLength={4000}
        defaultValue={option?.details}
      />
      {kind === "talent" && (
        <Field
          label="Usage terms: where it runs, how long, which country"
          name="usage"
          maxLength={500}
          defaultValue={option?.usage}
          placeholder="Organic and ads, 12 months, Tunisia"
        />
      )}
      {kind === "location" && (
        <Field
          label="Filming rules from the owner"
          name="usage"
          maxLength={500}
          defaultValue={option?.usage}
        />
      )}
      {kind !== "prop" && <PhotoPicker target={target} value={photos} onChange={setPhotos} />}
      <TextArea
        label={
          kind === "talent"
            ? "Team only: phone, agent, anything private"
            : kind === "location"
              ? "Team only: owner contact, deposit paid"
              : "Team only: where to buy it"
        }
        name="privateNotes"
        rows={2}
        maxLength={2000}
        defaultValue={option?.privateNotes ?? ""}
      />
      {kind === "talent" && (
        <label className="check">
          <input
            type="checkbox"
            name="releaseOnFile"
            defaultChecked={Boolean(option?.releaseOnFile)}
          />{" "}
          Signed release on file
        </label>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={act.save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={act.save.isPending}>
          {option ? "Save" : "Send to the client"}
        </Button>
      </div>
    </form>
  );
}
