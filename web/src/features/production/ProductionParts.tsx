import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import { IMAGE_TYPES, uploadImage, useImageUrl } from "@/features/board/boardApi";
import { shortDate } from "@/features/concepts/model";
import { dt } from "@/features/portal/portalApi";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import {
  committedByKind,
  kindName,
  statusName,
  STEPS,
  talentRole,
  type Budget,
  type ProductionNote,
  type ProductionOption,
} from "./model";
import { PHOTO_BUCKET, type ProductionTarget } from "./productionApi";

/** Budget, what's said yes to, and what's left, split by talent, place and props. */
export function BudgetMeter({
  budget,
  options,
  reader,
}: {
  budget: Budget;
  options: ProductionOption[];
  reader: "client" | "team";
}) {
  const by = committedByKind(options);
  const cap = budget.cap;
  const left = cap == null ? null : cap - budget.committed;
  const scale = Math.max(cap ?? 0, budget.committed, 1);
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  return (
    <section className={`budget${left != null && left < 0 ? " over" : ""}`}>
      <div className="budget-head">
        <h2>{t("Production budget", "Budget de production")}</h2>
        {cap == null ? (
          <span className="small muted">
            {reader === "client"
              ? t(
                  "Gecko sets it with you before booking.",
                  "Gecko le fixe avec vous avant de réserver.",
                )
              : "No budget yet. Set one so the client approves against it."}
          </span>
        ) : (
          <span className="budget-cap">{dt(cap)}</span>
        )}
      </div>
      {cap != null && (
        <div
          className="budget-bar"
          role="img"
          aria-label={t(
            `${dt(budget.committed)} approved of ${dt(cap)}`,
            `${dt(budget.committed)} validés sur ${dt(cap)}`,
          )}
        >
          <span className="seg seg-talent" style={{ width: pct(by.talent) }} />
          <span className="seg seg-location" style={{ width: pct(by.location) }} />
          <span className="seg seg-prop" style={{ width: pct(by.prop) }} />
          {budget.committed > cap && (
            <span className="budget-line" style={{ left: pct(cap) }} aria-hidden="true" />
          )}
        </div>
      )}
      <dl className="budget-figures">
        <div>
          <dt>
            <i className="key key-talent" aria-hidden="true" />
            {kindName("talent", true)}
          </dt>
          <dd>{dt(by.talent)}</dd>
        </div>
        <div>
          <dt>
            <i className="key key-location" aria-hidden="true" />
            {kindName("location", true)}
          </dt>
          <dd>{dt(by.location)}</dd>
        </div>
        <div>
          <dt>
            <i className="key key-prop" aria-hidden="true" />
            {kindName("prop", true)}
          </dt>
          <dd>{dt(by.prop)}</dd>
        </div>
        {left != null && (
          <div className="budget-left">
            <dt>{left < 0 ? t("Over by", "Dépassement") : t("Left", "Reste")}</dt>
            <dd>{dt(Math.abs(left))}</dd>
          </div>
        )}
      </dl>
      {budget.note && <p className="small muted">{budget.note}</p>}
      <p className="small muted">
        {reader === "client"
          ? t(
              "Gecko pays these upfront and adds them to your balance invoice, each with its receipt.",
              "Gecko les avance et les ajoute à votre facture de solde, chacun avec son reçu.",
            )
          : "Gecko pays these upfront; they go on the balance invoice."}
      </p>
    </section>
  );
}

function Photo({ path, alt }: { path: string; alt: string }) {
  const url = useImageUrl(path, PHOTO_BUCKET);
  if (!url.data) return <span className="prod-photo loading" aria-hidden="true" />;
  return (
    <a className="prod-photo" href={url.data} target="_blank" rel="noreferrer noopener">
      <img src={url.data} alt={alt} loading="lazy" />
    </a>
  );
}

export function Photos({ paths, alt }: { paths: string[]; alt: string }) {
  if (paths.length === 0) return null;
  return (
    <div className={`prod-photos n${Math.min(paths.length, 3)}`}>
      {paths.map((p) => (
        <Photo key={p} path={p} alt={alt} />
      ))}
    </div>
  );
}

/** Pick photos; each is shrunk and uploaded to the client's private folder straight away. */
export function PhotoPicker({
  target,
  value,
  onChange,
  max = 6,
}: {
  target: ProductionTarget;
  value: string[];
  onChange: (paths: string[]) => void;
  max?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, max - value.length)) {
        added.push((await uploadImage(target, file, PHOTO_BUCKET)).path);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      onChange([...value, ...added]);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="field photo-picker">
      <span className="label">{t("Photos", "Photos")}</span>
      <div className="prod-photos n3">
        {value.map((p) => (
          <span key={p} className="picked">
            <Photo path={p} alt="" />
            <button
              type="button"
              className="unpick"
              aria-label={t("Remove photo", "Retirer la photo")}
              onClick={() => onChange(value.filter((x) => x !== p))}
            >
              ×
            </button>
          </span>
        ))}
        {value.length < max && (
          <button
            type="button"
            className="add-photo"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? t("Uploading…", "Envoi…") : t("+ Add photos", "+ Ajouter des photos")}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES.filter((x) => x !== "image/gif").join(",")}
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

/** Where an approved cost stands: approved, booked, shot, paid by Gecko, on the invoice. */
export function Steps({ option, reader }: { option: ProductionOption; reader: "client" | "team" }) {
  const at = STEPS.indexOf(option.status);
  if (at < 0) return null;
  const steps = option.boughtBy === "client" ? STEPS.slice(0, 3) : STEPS;
  return (
    <ol className="prod-steps" aria-label={t("Where it stands", "Où ça en est")}>
      {steps.map((s, i) => (
        <li key={s} className={i < at ? "done" : i === at ? "now" : ""}>
          {statusName(s, reader)}
        </li>
      ))}
    </ol>
  );
}

function noteLine(note: ProductionNote): string {
  if (note.kind === "approve")
    return note.cost != null
      ? t(`Approved at ${dt(note.cost)}`, `Validé à ${dt(note.cost)}`)
      : t("Approved", "Validé");
  if (note.kind === "pass") return t("Passed", "Écarté");
  if (note.kind === "changed")
    return note.cost != null
      ? t(
          `Cost changed to ${dt(note.cost)}: needs a new yes`,
          `Coût modifié à ${dt(note.cost)} : à revalider`,
        )
      : t("Cost changed: needs a new yes", "Coût modifié : à revalider");
  return "";
}

export function ProductionNotes({ notes }: { notes: ProductionNote[] }) {
  if (notes.length === 0) return null;
  return (
    <ol className="notes" aria-label={t("Comments", "Commentaires")}>
      {notes.map((n) => (
        <li key={n.id} className={`note note-${n.kind}${n.fromClient ? " from-client" : ""}`}>
          <p className="small">
            <strong>{n.authorName || (n.fromClient ? t("Client", "Client") : "Gecko")}</strong>
            {noteLine(n) && <span className="note-kind">{noteLine(n)}</span>}
            <span className="muted"> · {shortDate(n.createdAt)}</span>
          </p>
          {n.body && (
            <p className="note-body" dir="auto">
              {n.body}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

/** One person, place or prop, as both sides see it. Actions go in as children. */
export function OptionCard({
  option,
  reader,
  children,
  extra,
}: {
  option: ProductionOption;
  reader: "client" | "team";
  children?: ReactNode;
  extra?: ReactNode;
}) {
  const o = option;
  return (
    <article className={`prod-card prod-${o.kind} prod-${o.status}`}>
      <Photos paths={o.photos} alt={o.name} />
      <div className="prod-body">
        <header className="prod-head">
          <h3 dir="auto">{o.name}</h3>
          <span className={`status status-${o.status === "proposed" ? "review" : o.status}`}>
            {statusName(o.status, reader)}
          </span>
        </header>
        <p className="prod-meta small">
          {o.role && <span>{o.kind === "talent" ? talentRole(o.role) : o.role}</span>}
          {o.cost != null && o.kind !== "prop" && o.status !== "suggested" && (
            <strong>{dt(o.cost)}</strong>
          )}
          {o.cost != null && o.kind === "prop" && (
            <strong>
              {o.boughtBy === "client"
                ? reader === "client"
                  ? t("You bring it", "Vous l'apportez")
                  : "The client brings it"
                : o.cost > 0
                  ? dt(o.cost)
                  : ""}
            </strong>
          )}
          {o.costNote && <span>{o.costNote}</span>}
          {o.overBudget && <span className="over-tag">{t("Over budget", "Hors budget")}</span>}
        </p>
        {o.when && (
          <p className="small">
            <span className="muted">{t("When", "Quand")}</span> {o.when}
          </p>
        )}
        {o.details && (
          <p className="pre small" dir="auto">
            {o.details}
          </p>
        )}
        {o.usage && (
          <p className="small prod-usage">
            <span className="muted">
              {o.kind === "talent"
                ? t("Usage", "Droits d'usage")
                : t("Owner's rules", "Règles du propriétaire")}
            </span>{" "}
            {o.usage}
          </p>
        )}
        {o.link && (
          <p className="small">
            <a href={o.link} target="_blank" rel="noreferrer noopener">
              {o.link.includes("instagram.com")
                ? "Instagram"
                : o.link.includes("airbnb")
                  ? "Airbnb"
                  : t("Open the link", "Ouvrir le lien")}
            </a>
          </p>
        )}
        {o.decidedBy && o.decidedAt && (
          <p className="small muted">
            {o.status === "passed"
              ? t(
                  `Passed by ${o.decidedBy} on ${shortDate(o.decidedAt)}`,
                  `Écarté par ${o.decidedBy} le ${shortDate(o.decidedAt)}`,
                )
              : t(
                  `Approved by ${o.decidedBy} on ${shortDate(o.decidedAt)}`,
                  `Validé par ${o.decidedBy} le ${shortDate(o.decidedAt)}`,
                )}
          </p>
        )}
        {o.fromClient && o.status === "suggested" && (
          <p className="small muted">
            {reader === "client"
              ? t(
                  `Suggested by ${o.authorName}. Gecko checks it and comes back with a price.`,
                  `Suggéré par ${o.authorName}. Gecko vérifie et revient avec un prix.`,
                )
              : `Suggested by ${o.authorName}. Add the cost and save to send it back as a proposal.`}
          </p>
        )}
        <Steps option={o} reader={reader} />
        {extra}
        <ProductionNotes notes={o.notes} />
        {children}
      </div>
    </article>
  );
}

/** A small comment box under a card. */
export function CommentBox({ onSend }: { onSend: (body: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
    if (!body) return setError(t("Write a comment first.", "Écrivez d'abord un commentaire."));
    setBusy(true);
    setError("");
    try {
      await onSend(body);
      setOpen(false);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <Button variant="link" onClick={() => setOpen(true)}>
        {t("Ask a question", "Poser une question")}
      </Button>
    );
  return (
    <form className="concept-form" onSubmit={onSubmit}>
      <TextArea
        label={t("Your question or comment", "Votre question ou commentaire")}
        name="body"
        rows={2}
        maxLength={2000}
        autoFocus
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={busy}>
          {t("Send", "Envoyer")}
        </Button>
      </div>
    </form>
  );
}
