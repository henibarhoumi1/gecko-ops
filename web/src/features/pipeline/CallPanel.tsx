import { useState } from "react";
import { toast } from "@/components/Toast";
import { afterCall, callScript, OUTCOME_LABEL, type CallOutcome } from "./calls";
import type { LeadPatch } from "./leadsApi";
import type { Lead } from "./model";

/** Call the lead: the number to tap, the script step by step, and one tap to log how it went. */
export function CallPanel({
  lead,
  me,
  save,
}: {
  lead: Lead;
  me: string | null;
  save: (p: LeadPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState("");
  const script = callScript(lead);
  const phone = (lead.phone || lead.whatsapp || "").replace(/[^\d+]/g, "");
  const current = script[step];

  function log(outcome: CallOutcome) {
    save(afterCall(lead, outcome, notes, new Date().toISOString(), me));
    toast({
      text: `Call logged: ${OUTCOME_LABEL[outcome]}`,
      detail: lead.brand,
      celebrate: outcome === "meeting",
    });
    setNotes("");
    setOpen(false);
    setStep(0);
  }

  return (
    <section className="lead-call">
      <div className="lead-call-head">
        <h3>Call</h3>
        <div className="lead-call-actions">
          {phone ? (
            <a className="btn btn-primary btn-small" href={`tel:${phone}`}>
              Call {lead.phone || lead.whatsapp}
            </a>
          ) : (
            <span className="small">No number yet: add one with “Edit all”.</span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide the script" : "Open the call script"}
          </button>
        </div>
      </div>
      {open && current && (
        <div className="call-script">
          <ol className="call-steps" aria-label="Steps">
            {script.map((s, i) => (
              <li key={s.key}>
                <button
                  type="button"
                  aria-current={i === step ? "step" : undefined}
                  className={i < step ? "done" : ""}
                  onClick={() => setStep(i)}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
          <div className="call-say">
            {current.say.map((line, i) => (
              <p key={i} dir="auto">
                {line}
              </p>
            ))}
            {current.tip && <p className="small call-tip">Tip: {current.tip}</p>}
            <div className="call-nav">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={step === script.length - 1}
                onClick={() => setStep(step + 1)}
              >
                Next →
              </button>
            </div>
          </div>
          <label className="field">
            <span>Notes from the call</span>
            <textarea
              rows={2}
              value={notes}
              maxLength={600}
              placeholder="What they said, the date you agreed…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="call-outcomes" role="group" aria-label="How did it go?">
            {(Object.keys(OUTCOME_LABEL) as CallOutcome[]).map((o) => (
              <button key={o} type="button" className={`chip outcome-${o}`} onClick={() => log(o)}>
                {OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
