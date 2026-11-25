// The parts every writing space shares, on both sides: the panel that saves the shoot plan as you pick, the length
// picker, and the card of the idea a script is written from.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import type { ShootPlan } from "@/features/scripts/model";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { ShootPanel } from "./ShootPanel";
import { planCount, samePlan, tidyPlan, type ShootChoices } from "./shootPlan";

/**
 * The shoot plan beside a script or an idea someone is reading: picking saves on its own a moment later, so the
 * plan can change without opening the editor. Logistics only: it never makes a new version.
 */
export function LiveShootPanel({
  choices,
  plan,
  onSave,
  note,
  empty,
}: {
  choices: ShootChoices;
  plan: ShootPlan;
  /** Left out, the panel only shows the plan. */
  onSave?: ((plan: ShootPlan) => Promise<unknown>) | undefined;
  note?: ReactNode;
  empty?: ReactNode;
}) {
  const [local, setLocal] = useState<ShootPlan>(plan);
  // Reading: only what's picked. Changing opens every choice.
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);

  // A newer plan from the server (someone else changed it) shows, unless we're mid-edit.
  useEffect(() => {
    if (!dirty.current && !samePlan(plan, local)) setLocal(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function change(next: ShootPlan) {
    setLocal(next);
    if (!onSave) return;
    dirty.current = true;
    setState("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onSave(tidyPlan(next)).then(
        () => {
          dirty.current = false;
          setState("saved");
          setError("");
        },
        (e: unknown) => {
          dirty.current = false;
          setState("error");
          setError(friendlyError(e));
        },
      );
    }, 700);
  }

  const status =
    state === "saving"
      ? t("Saving…", "Enregistrement…")
      : state === "saved"
        ? t("Saved", "Enregistré")
        : state === "error"
          ? error
          : null;

  return (
    <div className="live-onset">
      <ShootPanel
        choices={choices}
        plan={local}
        onChange={onSave && open ? change : undefined}
        empty={empty}
        note={
          note || status ? (
            <>
              {note}
              {status && (
                <span className={`onset-save is-${state}`} role="status">
                  {status}
                </span>
              )}
            </>
          ) : undefined
        }
        footer={
          onSave ? (
            <Button
              variant={open ? "primary" : "secondary"}
              className="btn-small"
              onClick={() => setOpen((v) => !v)}
            >
              {open
                ? t("Done", "Terminé")
                : planCount(local) > 0
                  ? t("Change who, where, what", "Changer qui, où, quoi")
                  : t("Plan who, where, what", "Prévoir qui, où, quoi")}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

const LENGTHS = [9, 15, 20, 30, 45, 60, 90] as const;

/** The video's length as one row of choices, with any other length kept as its own choice. */
export function LengthPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (seconds: number) => void;
}) {
  const options = LENGTHS.includes(value as (typeof LENGTHS)[number])
    ? [...LENGTHS]
    : [...LENGTHS, value].sort((a, b) => a - b);
  return (
    <div className="len-pick" role="radiogroup" aria-label={t("Length", "Durée")}>
      <span className="len-label">{t("Length", "Durée")}</span>
      <div className="len-row">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className="len-opt"
            onClick={() => onChange(n)}
          >
            {n}
            <span>s</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The idea a script is written from, in the side rail: its hook and what happens, with its hook one click away. */
export function IdeaCard({
  title,
  hook,
  body,
  onUseHook,
}: {
  title: string;
  hook?: string | undefined;
  body?: string | undefined;
  /** Shown while the script has no hook yet. */
  onUseHook?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  const long = (body ?? "").length > 220;
  return (
    <section className="idea-card" aria-label={t("The idea", "L'idée")}>
      <div className="idea-card-head">
        <h3>{t("The idea", "L'idée")}</h3>
      </div>
      <strong className="idea-card-title" dir="auto">
        {title}
      </strong>
      {hook && (
        <q className="idea-card-hook" dir="auto">
          {hook}
        </q>
      )}
      {body && (
        <p className={`idea-card-body${long && !open ? " is-clamped" : ""}`} dir="auto">
          {body}
        </p>
      )}
      <div className="idea-card-actions">
        {long && (
          <button type="button" className="onset-more" onClick={() => setOpen((v) => !v)}>
            {open ? t("Show less", "Moins") : t("Read it all", "Tout lire")}
          </button>
        )}
        {hook && onUseHook && (
          <Button variant="secondary" className="btn-small" onClick={onUseHook}>
            {t("Use its hook", "Utiliser son accroche")}
          </Button>
        )}
      </div>
    </section>
  );
}
