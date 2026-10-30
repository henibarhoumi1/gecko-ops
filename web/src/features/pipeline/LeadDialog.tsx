import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import type { Member } from "@/features/workspace/members";
import { friendlyError } from "@/lib/errors";
import { newLeadId, useSaveLead, type LeadInput } from "./leadsApi";
import {
  CHANNELS,
  gapMessage,
  gaps,
  LOST_REASONS,
  OUTCOMES,
  STAGE_LABEL,
  STEPS,
  stepOf,
  type Lead,
  type Stage,
} from "./model";

const STAGE_OPTIONS = [...STEPS, ...OUTCOMES].map((s) => [s, STAGE_LABEL[s]] as const);

export function blankLead(ownerId: string | null, today: string): LeadInput {
  return {
    id: newLeadId(),
    brand: "",
    stage: "prospect",
    channel: "outbound_dm",
    contact: null,
    handle: null,
    phone: null,
    whatsapp: null,
    url: null,
    sector: null,
    pack: null,
    value: null,
    client_id: null,
    owner_member_id: ownerId,
    next_step: null,
    next_date: today,
    lost_reason: null,
    history: [{ at: today, stage: "prospect" }],
  };
}

interface LeadDialogProps {
  lead: LeadInput | Lead;
  isNew: boolean;
  members: Member[];
  today: string;
  notice?: string;
  onClose: () => void;
}

/** Add or edit one lead. Open leads can't be saved without an owner, a next step and a date. */
export function LeadDialog({ lead, isNew, members, today, notice, onClose }: LeadDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const save = useSaveLead();
  const [stage, setStage] = useState<Stage>(lead.stage);
  const [error, setError] = useState(notice ?? "");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || null;
    const nextStage = form.get("stage") as Stage;
    const changedStage = stepOf(nextStage) !== stepOf(lead.stage);
    const draft: LeadInput = {
      ...stripRow(lead),
      brand: text("brand") ?? "",
      handle: text("handle"),
      contact: text("contact"),
      phone: text("phone"),
      channel: text("channel"),
      owner_member_id: text("owner"),
      stage: changedStage ? nextStage : lead.stage,
      next_step: text("next_step"),
      next_date: text("next_date"),
      lost_reason: nextStage === "lost" ? text("lost_reason") : null,
      history: changedStage ? [...lead.history, { at: today, stage: nextStage }] : lead.history,
    };
    const missing = gaps(draft, new Set(members.map((m) => m.id)));
    if (missing.length) {
      setError(gapMessage(missing));
      return;
    }
    try {
      await save.mutateAsync(draft);
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      onClose={onClose}
      aria-label={isNew ? "Add lead" : lead.brand}
    >
      <form className="stack" onSubmit={onSubmit}>
        <h2>{isNew ? "Add lead" : lead.brand}</h2>
        <Field
          label="Brand"
          name="brand"
          defaultValue={lead.brand}
          required
          maxLength={160}
          autoFocus={isNew}
        />
        <div className="row">
          <Field
            label="Instagram or TikTok"
            name="handle"
            defaultValue={lead.handle ?? ""}
            placeholder="@brand"
          />
          <Field label="Contact person" name="contact" defaultValue={lead.contact ?? ""} />
        </div>
        <div className="row">
          <Field label="Phone" name="phone" type="tel" defaultValue={lead.phone ?? ""} />
          <Select
            label="Where they came from"
            name="channel"
            defaultValue={lead.channel ?? ""}
            options={[["", "—"], ...Object.entries(CHANNELS)]}
          />
        </div>
        <div className="row">
          <Select
            label="Stage"
            name="stage"
            defaultValue={stepOf(lead.stage)}
            onChange={(e) => setStage(e.target.value as Stage)}
            options={STAGE_OPTIONS}
          />
          <Select
            label="Owner"
            name="owner"
            defaultValue={lead.owner_member_id ?? ""}
            options={[["", "—"], ...members.map((m) => [m.id, m.name] as const)]}
          />
        </div>
        {stage === "lost" && (
          <Select
            label="Why it was lost"
            name="lost_reason"
            defaultValue={lead.lost_reason ?? ""}
            options={[["", "—"], ...Object.entries(LOST_REASONS)]}
          />
        )}
        <div className="row">
          <Field
            label="Next step"
            name="next_step"
            defaultValue={lead.next_step ?? ""}
            placeholder="Send the test pack offer"
            maxLength={500}
          />
          <Field label="By" name="next_date" type="date" defaultValue={lead.next_date ?? ""} />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="actions">
          <Button variant="secondary" onClick={() => ref.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function stripRow(lead: LeadInput | Lead): LeadInput {
  const {
    id,
    brand,
    stage,
    channel,
    contact,
    handle,
    phone,
    whatsapp,
    url,
    sector,
    pack,
    value,
    client_id,
    owner_member_id,
    next_step,
    next_date,
    lost_reason,
    history,
  } = lead;
  return {
    id,
    brand,
    stage,
    channel,
    contact,
    handle,
    phone,
    whatsapp,
    url,
    sector,
    pack,
    value,
    client_id,
    owner_member_id,
    next_step,
    next_date,
    lost_reason,
    history,
  };
}
