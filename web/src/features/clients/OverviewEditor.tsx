import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import type { Milestone } from "@/features/portal/portalApi";
import { friendlyError } from "@/lib/errors";
import { blankPortal, usePortalRow, useSavePortal, type PortalRow } from "./clientsApi";

/** Gecko's usual steps. The first drafts land 7 days after the shoot. */
export function standardMilestones(shootDate: string | null): Milestone[] {
  const plus = (days: number) => {
    if (!shootDate) return null;
    const d = new Date(`${shootDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return [
    { label: "Onboarding sent", date: null, done: false },
    { label: "Ideas approved", date: null, done: false },
    { label: "Scripts approved", date: null, done: false },
    { label: "Shoot day", date: shootDate, done: false },
    { label: "First drafts", date: plus(7), done: false },
    { label: "Final files", date: null, done: false },
  ];
}

/** What the client sees on their Overview: the plan, the shoot, the timeline and the payments. */
export function OverviewEditor({ clientId }: { clientId: string }) {
  const row = usePortalRow(clientId);
  const save = useSavePortal(clientId);
  const [draft, setDraft] = useState<PortalRow | null>(null);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (row.data !== undefined && draft === null) setDraft(row.data ?? blankPortal(clientId));
  }, [row.data, draft, clientId]);

  if (row.isPending || !draft) return <p className="muted">Loading…</p>;
  if (row.isError) return <Notice tone="error">{friendlyError(row.error)}</Notice>;

  const patch = (fields: Partial<PortalRow>) => {
    setDraft({ ...draft, ...fields });
    setMessage(null);
  };
  const setMilestone = (i: number, fields: Partial<Milestone>) =>
    patch({ milestones: draft.milestones.map((m, n) => (n === i ? { ...m, ...fields } : m)) });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const clean: PortalRow = {
      ...draft,
      included: draft.included.map((s) => s.trim()).filter(Boolean),
      milestones: draft.milestones
        .filter((m) => m.label.trim())
        .map((m) => ({ label: m.label.trim(), date: m.date || null, done: Boolean(m.done) })),
    };
    try {
      await save.mutateAsync(clean);
      setDraft(clean);
      setMessage({ tone: "info", text: "Saved. The client sees it now." });
    } catch (e) {
      setMessage({ tone: "error", text: friendlyError(e) });
    }
  }

  return (
    <form className="stack tab-body" onSubmit={onSubmit}>
      <p className="lede">This is what the client sees on their Overview.</p>
      <Field
        label="Campaign name"
        value={draft.campaign}
        maxLength={160}
        placeholder="Test campaign, November 2026"
        onChange={(e) => patch({ campaign: e.target.value })}
      />
      <TextArea
        label="Short summary"
        rows={3}
        value={draft.summary}
        maxLength={2000}
        onChange={(e) => patch({ summary: e.target.value })}
      />
      <TextArea
        label="What's included (one per line)"
        rows={4}
        value={draft.included.join("\n")}
        placeholder={"15 edited reels\n1 carousel\nConcepts and strategy"}
        onChange={(e) => patch({ included: e.target.value.split("\n").slice(0, 20) })}
      />
      <div className="row">
        <Field
          label="Shoot date"
          type="date"
          value={draft.shoot_date ?? ""}
          onChange={(e) => patch({ shoot_date: e.target.value || null })}
        />
        <Field
          label="Shoot place"
          value={draft.shoot_place}
          maxLength={200}
          onChange={(e) => patch({ shoot_place: e.target.value })}
        />
      </div>
      <Field
        label="Next step"
        value={draft.next_step}
        maxLength={500}
        placeholder="Fill in the onboarding by Tuesday"
        onChange={(e) => patch({ next_step: e.target.value })}
      />

      <fieldset className="fieldset">
        <legend>Timeline</legend>
        {draft.milestones.map((m, i) => (
          <div className="milestone" key={i}>
            <input
              aria-label="Step"
              value={m.label}
              maxLength={120}
              onChange={(e) => setMilestone(i, { label: e.target.value })}
            />
            <input
              aria-label="Date"
              type="date"
              value={m.date ?? ""}
              onChange={(e) => setMilestone(i, { date: e.target.value || null })}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={Boolean(m.done)}
                onChange={(e) => setMilestone(i, { done: e.target.checked })}
              />
              Done
            </label>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove step"
              onClick={() => patch({ milestones: draft.milestones.filter((_, n) => n !== i) })}
            >
              ×
            </button>
          </div>
        ))}
        <div className="actions start">
          {draft.milestones.length < 20 && (
            <Button
              variant="secondary"
              onClick={() =>
                patch({ milestones: [...draft.milestones, { label: "", date: null, done: false }] })
              }
            >
              Add step
            </Button>
          )}
          {draft.milestones.length === 0 && (
            <Button
              variant="link"
              onClick={() => patch({ milestones: standardMilestones(draft.shoot_date) })}
            >
              Use the standard steps
            </Button>
          )}
        </div>
      </fieldset>

      <div className="row">
        <Field
          label="Price (DT)"
          type="number"
          min={0}
          step="0.001"
          value={draft.price ?? ""}
          onChange={(e) => patch({ price: e.target.value === "" ? null : Number(e.target.value) })}
        />
        <Select
          label="Deposit (50%)"
          value={draft.deposit_status}
          options={[
            ["due", "Due"],
            ["paid", "Paid"],
          ]}
          onChange={(e) => patch({ deposit_status: e.target.value as PortalRow["deposit_status"] })}
        />
        <Select
          label="Balance (50%)"
          value={draft.balance_status}
          options={[
            ["later", "Later"],
            ["due", "Due"],
            ["paid", "Paid"],
          ]}
          onChange={(e) => patch({ balance_status: e.target.value as PortalRow["balance_status"] })}
        />
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="actions">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save overview"}
        </Button>
      </div>
    </form>
  );
}
