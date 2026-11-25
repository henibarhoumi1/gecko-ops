// "On set": who is in it, which sets, which props (Heni, 25 Nov 2026). The same panel beside every idea and script,
// on Gecko's side and the client's: talent and sets with their photos, several sets in the order they're shot,
// props as chips, anything else in plain words. Without onChange it only shows what's picked.
import { useState, type ReactNode } from "react";
import { useImageUrl } from "@/features/board/boardApi";
import { PHOTO_BUCKET } from "@/features/production/productionApi";
import type { ShootPlan } from "@/features/scripts/model";
import { t } from "@/lib/i18n";
import {
  initials,
  picked,
  planCount,
  planSets,
  toggle,
  withSets,
  type Choice,
  type ShootChoices,
} from "./shootPlan";

/** A photo from the production bucket, or the initials on a soft tile while there's none. */
export function ChoicePhoto({
  path,
  name,
  className = "",
}: {
  path?: string | undefined;
  name: string;
  className?: string;
}) {
  const url = useImageUrl(path, PHOTO_BUCKET);
  return (
    <span className={`cp ${className}`.trim()} aria-hidden="true">
      {url.data ? <img src={url.data} alt="" loading="lazy" draggable={false} /> : null}
      {!url.data && <span className="cp-initials">{initials(name)}</span>}
    </span>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count?: number;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="onset-sec">
      <div className="onset-sec-head">
        <h4>{title}</h4>
        {count ? <span className="onset-n">{count}</span> : null}
        {hint && <span className="onset-hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function ShootPanel({
  choices,
  plan,
  onChange,
  empty,
  title = t("On set", "Sur le tournage"),
  note,
  footer,
}: {
  choices: ShootChoices;
  plan: ShootPlan;
  /** Left out, the panel only shows what's picked. */
  onChange?: ((plan: ShootPlan) => void) | undefined;
  /** What to say when there's nothing to pick from yet. */
  empty?: ReactNode;
  title?: string;
  /** A line under the title: who can change it, or why it's locked. */
  note?: ReactNode;
  /** At the bottom: a button to change the plan, a done button. */
  footer?: ReactNode;
}) {
  const edit = Boolean(onChange);
  const sets = planSets(plan);
  const allSets = [...choices.sets, ...choices.places.filter((p) => sets.includes(p.id))];
  const count = planCount(plan);
  const nothing =
    choices.talent.length + choices.sets.length + choices.props.length === 0 && count === 0;
  const set = (next: ShootPlan) => onChange?.(next);

  if (!edit && count === 0)
    return (
      <aside className="onset is-read is-empty" aria-label={title}>
        <div className="onset-head">
          <h3>{title}</h3>
        </div>
        {note && <p className="onset-note">{note}</p>}
        <p className="onset-empty">{t("Not planned yet.", "Pas encore prévu.")}</p>
        {footer && <div className="onset-foot">{footer}</div>}
      </aside>
    );

  const talent = edit ? choices.talent : picked(choices.talent, plan.talent);
  const setList = edit ? allSets : picked(allSets, sets);
  const props = edit ? choices.props : picked(choices.props, plan.props);

  return (
    <aside className={`onset${edit ? " is-edit" : " is-read"}`} aria-label={title}>
      <div className="onset-head">
        <h3>{title}</h3>
        {count > 0 && (
          <span className="onset-count">
            {t(`${count} picked`, `${count} choisi${count > 1 ? "s" : ""}`)}
          </span>
        )}
      </div>
      {note && <p className="onset-note">{note}</p>}
      {nothing && edit && <p className="onset-empty">{empty}</p>}

      {talent.length > 0 && (
        <Section
          title={t("Talent", "Talents")}
          count={plan.talent?.length}
          hint={edit ? t("one or more", "un ou plusieurs") : undefined}
        >
          <ul className="onset-people">
            {talent.map((c) => {
              const on = (plan.talent ?? []).includes(c.id);
              return (
                <li key={c.id}>
                  <TalentTile
                    choice={c}
                    on={on}
                    onPress={
                      edit ? () => set({ ...plan, talent: toggle(plan.talent, c.id) }) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {setList.length > 0 && (
        <Section
          title={t("Sets", "Décors")}
          count={sets.length}
          hint={edit ? t("in the order we shoot", "dans l'ordre du tournage") : undefined}
        >
          <ul className="onset-sets">
            {setList.map((c) => {
              const at = sets.indexOf(c.id);
              return (
                <li key={c.id}>
                  <SetTile
                    choice={c}
                    order={at >= 0 ? at + 1 : null}
                    onPress={
                      edit
                        ? () =>
                            set(
                              withSets(
                                plan,
                                at >= 0 ? sets.filter((x) => x !== c.id) : [...sets, c.id],
                              ),
                            )
                        : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {(props.length > 0 || edit || plan.extraProps?.trim()) && (
        <Section title={t("Props", "Accessoires")} count={plan.props?.length}>
          {props.length > 0 && (
            <ul className="onset-props">
              {props.map((c) => {
                const on = (plan.props ?? []).includes(c.id);
                const body = (
                  <>
                    <ChoicePhoto path={c.photos[0]} name={c.name} className="cp-dot" />
                    <span>{c.name}</span>
                    {edit && on && <Check />}
                  </>
                );
                return (
                  <li key={c.id}>
                    {edit ? (
                      <button
                        type="button"
                        className="onset-prop"
                        aria-pressed={on}
                        onClick={() => set({ ...plan, props: toggle(plan.props, c.id) })}
                      >
                        {body}
                      </button>
                    ) : (
                      <span className="onset-prop">{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {edit ? (
            <ExtraProps
              value={plan.extraProps ?? ""}
              onChange={(extraProps) => set({ ...plan, extraProps })}
            />
          ) : (
            plan.extraProps?.trim() && (
              <p className="onset-extra" dir="auto">
                {plan.extraProps}
              </p>
            )
          )}
        </Section>
      )}
      {footer && <div className="onset-foot">{footer}</div>}
    </aside>
  );
}

function TalentTile({
  choice: c,
  on,
  onPress,
}: {
  choice: Choice;
  on: boolean;
  onPress?: (() => void) | undefined;
}) {
  const body = (
    <>
      <span className="onset-face">
        <ChoicePhoto path={c.photos[0]} name={c.name} />
        {onPress && (
          <span className="onset-tick" aria-hidden="true">
            <Check />
          </span>
        )}
      </span>
      <span className="onset-name" dir="auto">
        {c.name}
      </span>
      <span className="onset-meta">
        {c.detail && <span>{c.detail}</span>}
        {c.stands === "waiting" && (
          <span className="onset-wait">{t("not approved yet", "pas encore validé")}</span>
        )}
      </span>
    </>
  );
  return onPress ? (
    <button
      type="button"
      className={`onset-person${c.stands === "waiting" ? " is-waiting" : ""}`}
      aria-pressed={on}
      onClick={onPress}
    >
      {body}
    </button>
  ) : (
    <span className="onset-person is-shown">{body}</span>
  );
}

function SetTile({
  choice: c,
  order,
  onPress,
}: {
  choice: Choice;
  order: number | null;
  onPress?: (() => void) | undefined;
}) {
  const body = (
    <>
      <span className="onset-shot">
        <ChoicePhoto path={c.photos[0]} name={c.name} />
        {order != null && (
          <span className="onset-order" aria-label={t(`shot ${order}`, `plan ${order}`)}>
            {order}
          </span>
        )}
      </span>
      <span className="onset-name" dir="auto">
        {c.name}
      </span>
      {c.detail && (
        <span className="onset-detail" dir="auto">
          {c.detail}
        </span>
      )}
    </>
  );
  return onPress ? (
    <button type="button" className="onset-set" aria-pressed={order != null} onClick={onPress}>
      {body}
    </button>
  ) : (
    <span className="onset-set is-shown">{body}</span>
  );
}

function ExtraProps({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(Boolean(value.trim()));
  if (!open)
    return (
      <button type="button" className="onset-more" onClick={() => setOpen(true)}>
        {t("+ Something else to bring", "+ Autre chose à apporter")}
      </button>
    );
  return (
    <label className="onset-extra-edit">
      <span>{t("Also bring", "À apporter aussi")}</span>
      <textarea
        dir="auto"
        rows={2}
        maxLength={1000}
        value={value}
        placeholder={t(
          "A TV with a match on, a handwritten list",
          "Une télé avec un match, une liste écrite à la main",
        )}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** One line for a card: the faces, the sets and the props, read-only. */
export function ShootStrip({ choices, plan }: { choices: ShootChoices; plan: ShootPlan }) {
  const talent = picked(choices.talent, plan.talent);
  const sets = picked([...choices.sets, ...choices.places], planSets(plan));
  const props = picked(choices.props, plan.props);
  if (!talent.length && !sets.length && !props.length && !plan.extraProps?.trim()) return null;
  return (
    <div className="onset-strip" aria-label={t("On set", "Sur le tournage")}>
      {talent.length > 0 && (
        <span className="onset-strip-group">
          <span className="onset-stack">
            {talent.slice(0, 5).map((c) => (
              <ChoicePhoto key={c.id} path={c.photos[0]} name={c.name} className="cp-mini" />
            ))}
          </span>
          <span>{talent.map((c) => c.name).join(", ")}</span>
        </span>
      )}
      {sets.length > 0 && (
        <span className="onset-strip-group">
          <span className="onset-strip-label">{t("Sets", "Décors")}</span>
          <span>{sets.map((c) => c.name).join(" · ")}</span>
        </span>
      )}
      {(props.length > 0 || plan.extraProps?.trim()) && (
        <span className="onset-strip-group">
          <span className="onset-strip-label">{t("Props", "Accessoires")}</span>
          <span>
            {[...props.map((c) => c.name), plan.extraProps?.trim() ?? ""]
              .filter(Boolean)
              .join(", ")}
          </span>
        </span>
      )}
    </div>
  );
}
