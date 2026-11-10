import { useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { PLAN_OPTIONS, PLANS, type PlanId } from "@/features/plans/model";
import { friendlyError } from "@/lib/errors";
import type { Lead } from "./model";
import {
  draftProposal,
  fullContent,
  lines,
  proposalMessage,
  proposalState,
  type Proposal,
  type ProposalContent,
} from "./proposal";
import { useProposalActions, useProposals } from "./proposalsApi";

const STATE_LABEL = {
  draft: "Draft",
  sent: "Sent, not opened yet",
  viewed: "Opened",
  accepted: "Accepted",
  expired: "Link expired",
} as const;

/** The proposal part of the lead panel: write it from the lead, send a link, see when it's opened and accepted. */
export function ProposalPanel({ lead }: { lead: Lead }) {
  const proposals = useProposals(lead.id);
  const act = useProposalActions(lead.id);
  const [editing, setEditing] = useState<{ id: string | null; content: ProposalContent } | null>(
    null,
  );
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState("");

  if (proposals.isPending) return null;
  if (proposals.isError) return null; // Not founder or sales: no proposals here.
  const list = proposals.data;

  async function save() {
    if (!editing) return;
    setError("");
    try {
      await act.save.mutateAsync(editing);
      setEditing(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function makeLink(p: Proposal) {
    setError("");
    try {
      const token = await act.link.mutateAsync(p.id);
      setLink({ id: p.id, url: `${window.location.origin}/p/${token}` });
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <section className="lead-proposals">
      <div className="group-head">
        <h3>Proposal</h3>
        {!editing && (
          <Button
            variant="secondary"
            className="btn-small"
            onClick={() => setEditing({ id: null, content: draftProposal(lead) })}
          >
            {list.length ? "+ Another one" : "Write the proposal"}
          </Button>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {editing && (
        <ProposalEditor
          content={editing.content}
          onChange={(content) => setEditing({ ...editing, content })}
          onSave={() => void save()}
          onCancel={() => setEditing(null)}
          busy={act.save.isPending}
        />
      )}
      {list.map((p) => {
        const state = proposalState(p);
        const c = fullContent(p.content, lead);
        const plan = PLANS[c.plan];
        return (
          <div key={p.id} className={`proposal-card state-${state}`}>
            <p>
              <strong>{plan.label}</strong> · {c.price == null ? "on quote" : `${c.price} DT`}
              <span className="small muted">
                {" "}
                · {STATE_LABEL[state]}
                {p.views > 0 && state !== "accepted" && ` (${p.views}×)`}
                {p.acceptedName && ` by ${p.acceptedName}`}
              </span>
            </p>
            {link?.id === p.id && (
              <div className="proposal-link">
                <code>{link.url}</code>
                <div className="actions">
                  <Button
                    variant="secondary"
                    className="btn-small"
                    onClick={() => void navigator.clipboard?.writeText(link.url)}
                  >
                    Copy the link
                  </Button>
                  {lead.whatsapp || lead.phone ? (
                    <a
                      className="btn btn-small"
                      target="_blank"
                      rel="noreferrer noopener"
                      href={`https://wa.me/${(lead.whatsapp || lead.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                        proposalMessage(lead.brand, link.url, c.lang, "Gecko"),
                      )}`}
                    >
                      Send on WhatsApp
                    </a>
                  ) : null}
                </div>
                <p className="small muted">
                  Shown once: copy it now. Making a new link stops this one.
                </p>
              </div>
            )}
            {state !== "accepted" && (
              <div className="actions">
                <Button variant="link" onClick={() => setEditing({ id: p.id, content: c })}>
                  Edit
                </Button>
                <Button
                  variant="link"
                  onClick={() => void makeLink(p)}
                  disabled={act.link.isPending}
                >
                  {p.hasLink ? "New link" : "Make the link"}
                </Button>
                <Button variant="link" onClick={() => void act.remove.mutateAsync(p.id)}>
                  Remove
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function ProposalEditor({
  content,
  onChange,
  onSave,
  onCancel,
  busy,
}: {
  content: ProposalContent;
  onChange: (c: ProposalContent) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const set = (patch: Partial<ProposalContent>) => onChange({ ...content, ...patch });
  const area = (label: string, value: string[], key: "goals" | "included" | "timeline") => (
    <label className="proposal-field">
      <span className="small">{label} (one per line)</span>
      <textarea
        rows={3}
        dir="auto"
        defaultValue={value.join("\n")}
        onChange={(e) => set({ [key]: lines(e.target.value) })}
      />
    </label>
  );
  return (
    <div className="proposal-editor">
      <div className="proposal-row">
        <label className="proposal-field">
          <span className="small">Language</span>
          <select
            value={content.lang}
            onChange={(e) => set({ lang: e.target.value as "en" | "fr" })}
          >
            <option value="fr">French</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="proposal-field">
          <span className="small">Plan</span>
          <select
            value={content.plan}
            onChange={(e) => {
              const plan = e.target.value as PlanId;
              const p = PLANS[plan];
              set({ plan, price: p.price, reels: p.reels, included: [...p.included] });
            }}
          >
            {PLAN_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="proposal-field">
          <span className="small">Price (DT, empty = on quote)</span>
          <input
            type="number"
            min={0}
            value={content.price ?? ""}
            onChange={(e) => set({ price: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </label>
        <label className="proposal-field">
          <span className="small">Reels</span>
          <input
            type="number"
            min={0}
            value={content.reels ?? ""}
            onChange={(e) => set({ reels: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </label>
      </div>
      <label className="proposal-field">
        <span className="small">Opening words</span>
        <textarea
          rows={3}
          dir="auto"
          value={content.intro}
          onChange={(e) => set({ intro: e.target.value })}
        />
      </label>
      {area("What it should do", content.goals, "goals")}
      {area("What's included", content.included, "included")}
      {area("How it goes", content.timeline, "timeline")}
      <label className="proposal-field">
        <span className="small">Payment and terms</span>
        <textarea
          rows={2}
          dir="auto"
          value={content.terms}
          onChange={(e) => set({ terms: e.target.value })}
        />
      </label>
      <div className="actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : "Save the proposal"}
        </Button>
      </div>
    </div>
  );
}
