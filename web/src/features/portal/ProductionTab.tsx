import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { TextArea } from "@/components/TextArea";
import type { ClientPortal } from "@/features/auth/account";
import {
  BudgetMeter,
  CommentBox,
  OptionCard,
  PhotoPicker,
} from "@/features/production/ProductionParts";
import {
  isCommitted,
  kindName,
  statusName,
  wouldGoOver,
  type Budget,
  type OptionKind,
  type ProductionOption,
} from "@/features/production/model";
import { useClientProduction, useMyProduction } from "@/features/production/productionApi";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { tw } from "@/lib/wording";
import { dt } from "./portalApi";
import { useClientRole, type ClientRole } from "./role";

/** Who can say yes to a cost: everyone but viewers. Over the budget: the owner or finance. */
const canSpend = (role: ClientRole) => role !== "viewer";
const canGoOver = (role: ClientRole) => role === "owner" || role === "finance";

function intro(kind: OptionKind | "budget"): string {
  if (kind === "talent")
    return tw(
      [
        "The people Gecko proposes for your shoot, with their fee and where the video will run. Approve the ones you want, pass on the rest, or suggest someone.",
        "Les personnes que Gecko propose pour votre tournage, avec leur cachet et la diffusion prévue. Validez celles que vous voulez, écartez les autres, ou suggérez quelqu'un.",
      ],
      [
        "The faces Gecko proposes for the campaign, with their fee and usage. Approve the ones that fit the brand, pass on the rest, or suggest someone.",
        "Les visages que Gecko propose pour la campagne, avec leur cachet et leurs droits. Validez ceux qui collent à la marque, écartez les autres, ou suggérez quelqu'un.",
      ],
    );
  if (kind === "location")
    return tw(
      [
        "Where we could shoot, with the cost and what's included. Approve one, pass, or suggest a place you have in mind.",
        "Où nous pourrions tourner, avec le coût et ce qui est inclus. Validez-en un, écartez, ou suggérez un lieu auquel vous pensez.",
      ],
      [
        "The sets Gecko has scouted, with the light, the cost and what's included. Approve one, pass, or suggest a place.",
        "Les décors repérés par Gecko, avec la lumière, le coût et ce qui est inclus. Validez-en un, écartez, ou suggérez un lieu.",
      ],
    );
  return t(
    "Every cost for the shoot in one place: what you approved, what Gecko booked and paid, and what's left.",
    "Toutes les dépenses du tournage au même endroit : ce que vous avez validé, ce que Gecko a réservé et payé, et ce qu'il reste.",
  );
}

export function ProductionTab({
  portal,
  kind,
}: {
  portal: ClientPortal;
  kind: OptionKind | "budget";
}) {
  const page = useMyProduction(portal);
  const [suggesting, setSuggesting] = useState(false);
  if (page.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (page.isError) return <Notice tone="error">{friendlyError(page.error)}</Notice>;
  const { budget, options } = page.data;
  const kinds: OptionKind[] = kind === "budget" ? ["prop"] : [kind];
  const mine = options.filter((o) => kinds.includes(o.kind));
  const waiting = mine.filter((o) => o.status === "proposed");
  const yes = mine.filter(isCommitted);
  const suggested = mine.filter((o) => o.status === "suggested");
  const passed = mine.filter((o) => o.status === "passed");

  return (
    <section className="tab-body production">
      <div className="page-head">
        <p className="lede">{intro(kind)}</p>
        {kind !== "budget" && !suggesting && (
          <Button variant="secondary" onClick={() => setSuggesting(true)}>
            {kind === "talent"
              ? t("Suggest someone", "Suggérer quelqu'un")
              : t("Suggest a place", "Suggérer un lieu")}
          </Button>
        )}
      </div>
      {budget && <BudgetMeter budget={budget} options={options} reader="client" />}
      {suggesting && kind !== "budget" && (
        <SuggestForm portal={portal} kind={kind} onDone={() => setSuggesting(false)} />
      )}

      {kind === "budget" &&
        (budget ? (
          <CostTable options={options} />
        ) : (
          <p className="muted">
            {t(
              "Costs and the budget are visible to your owner and finance.",
              "Les coûts et le budget sont visibles par votre responsable et les finances.",
            )}
          </p>
        ))}

      {mine.length === 0 && !suggesting && kind !== "budget" && (
        <p className="muted">
          {kind === "talent"
            ? tw(
                [
                  "Gecko is casting. Profiles land here with photos and a fee, for you to approve.",
                  "Gecko fait le casting. Les profils arrivent ici avec photos et cachet, pour validation.",
                ],
                [
                  "Gecko is casting. Portfolios land here for you to approve.",
                  "Gecko fait le casting. Les books arrivent ici pour validation.",
                ],
              )
            : t(
                "Gecko is scouting. Places land here with photos and a cost, for you to approve.",
                "Gecko fait les repérages. Les lieux arrivent ici avec photos et coût, pour validation.",
              )}
        </p>
      )}

      {kind === "budget" && mine.length > 0 && (
        <h2 className="section-title">{kindName("prop", true)}</h2>
      )}
      <Group title={t("Needs you", "À valider")} items={waiting} portal={portal} budget={budget} />
      <Group title={t("Approved", "Validé")} items={yes} portal={portal} budget={budget} />
      <Group
        title={t("Your suggestions", "Vos suggestions")}
        items={suggested}
        portal={portal}
        budget={budget}
      />
      <Group title={t("Passed", "Écarté")} items={passed} portal={portal} budget={budget} />
    </section>
  );
}

function Group({
  title,
  items,
  portal,
  budget,
}: {
  title: string;
  items: ProductionOption[];
  portal: ClientPortal;
  budget: Budget | null;
}) {
  if (items.length === 0) return null;
  return (
    <div className="group">
      <h2>
        {title} <span className="count">{items.length}</span>
      </h2>
      <div className="prod-grid">
        {items.map((o) => (
          <OptionCard key={o.id} option={o} reader="client">
            <ClientActions portal={portal} option={o} budget={budget} />
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

function ClientActions({
  portal,
  option,
  budget,
}: {
  portal: ClientPortal;
  option: ProductionOption;
  budget: Budget | null;
}) {
  const role = useClientRole();
  const act = useClientProduction(portal);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const over = wouldGoOver(option, budget);
  const busy = act.decide.isPending;

  async function decide(decision: "approve" | "pass", overOk = false) {
    setError("");
    try {
      await act.decide.mutateAsync({ id: option.id, decision, body: "", over: overOk });
      setConfirm(false);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const comment = (body: string) => act.comment.mutateAsync({ id: option.id, body });

  if (option.status === "suggested")
    return (
      <div className="concept-actions">
        {option.mine && (
          <Button
            variant="link"
            disabled={act.remove.isPending}
            onClick={() =>
              act.remove.mutateAsync(option.id).catch((e: unknown) => setError(friendlyError(e)))
            }
          >
            {t("Remove", "Retirer")}
          </Button>
        )}
        <CommentBox onSend={comment} />
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    );

  const open = option.status === "proposed" || option.status === "passed";
  return (
    <div className="concept-actions">
      {open && !canSpend(role) && (
        <p className="small muted decide-note">
          {t(
            "Your owner, an approver or finance says yes to costs.",
            "C'est votre responsable, un valideur ou les finances qui acceptent les dépenses.",
          )}
        </p>
      )}
      {open && canSpend(role) && over && !confirm && (
        <p className="small over-note">
          {budget?.cap != null && option.cost != null
            ? t(
                `This takes the total to ${dt(budget.committed + option.cost)}, over the ${dt(budget.cap)} budget.`,
                `Le total passerait à ${dt(budget.committed + option.cost)}, au-delà du budget de ${dt(budget.cap)}.`,
              )
            : t("This goes over the budget.", "Cela dépasse le budget.")}
          {!canGoOver(role) &&
            " " +
              t(
                "Your owner or finance approves anything over budget.",
                "Votre responsable ou les finances valident ce qui dépasse le budget.",
              )}
        </p>
      )}
      {open && canSpend(role) && !over && (
        <Button disabled={busy} onClick={() => void decide("approve")}>
          {option.status === "passed"
            ? t("Approve after all", "Valider finalement")
            : t("Approve", "Valider")}
          {option.cost != null && option.cost > 0 && option.boughtBy === "gecko"
            ? ` · ${dt(option.cost)}`
            : ""}
        </Button>
      )}
      {open && canSpend(role) && over && canGoOver(role) && !confirm && (
        <Button disabled={busy} onClick={() => setConfirm(true)}>
          {t("Approve over budget", "Valider hors budget")}
        </Button>
      )}
      {confirm && (
        <div className="confirm-over">
          <p className="small">
            {t(
              "You're approving a cost above the agreed budget. Gecko books it and adds it to your balance invoice.",
              "Vous validez une dépense au-delà du budget convenu. Gecko la réserve et l'ajoute à votre facture de solde.",
            )}
          </p>
          <Button disabled={busy} onClick={() => void decide("approve", true)}>
            {t("Yes, approve over budget", "Oui, valider hors budget")}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            {t("Cancel", "Annuler")}
          </Button>
        </div>
      )}
      {canSpend(role) &&
        (option.status === "proposed" || option.status === "approved") &&
        !confirm && (
          <Button variant="secondary" disabled={busy} onClick={() => void decide("pass")}>
            {t("Pass", "Écarter")}
          </Button>
        )}
      <CommentBox onSend={comment} />
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

function SuggestForm({
  portal,
  kind,
  onDone,
}: {
  portal: ClientPortal;
  kind: OptionKind;
  onDone: () => void;
}) {
  const act = useClientProduction(portal);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    if (!text("name")) return setError(t("Add a name first.", "Ajoutez d'abord un nom."));
    try {
      await act.suggest.mutateAsync({
        kind,
        name: text("name"),
        details: text("details"),
        link: text("link"),
        photos,
      });
      onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <form className="concept-form card" onSubmit={onSubmit}>
      <h3>
        {kind === "talent"
          ? t("Someone you have in mind", "Quelqu'un à qui vous pensez")
          : t("A place you have in mind", "Un lieu auquel vous pensez")}
      </h3>
      <Field
        label={kind === "talent" ? t("Name", "Nom") : t("Name or area", "Nom ou quartier")}
        name="name"
        maxLength={120}
        autoFocus
      />
      <Field
        label={
          kind === "talent"
            ? t("Instagram or portfolio link", "Lien Instagram ou book")
            : t("Listing or map link", "Lien de l'annonce ou de la carte")
        }
        name="link"
        type="url"
        maxLength={1000}
        placeholder="https://"
      />
      <TextArea
        label={t("Why them, or anything we should know", "Pourquoi, ou ce qu'on doit savoir")}
        name="details"
        rows={3}
        maxLength={4000}
      />
      <PhotoPicker target={portal} value={photos} onChange={setPhotos} max={4} />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions">
        <Button variant="secondary" onClick={onDone} disabled={act.suggest.isPending}>
          {t("Cancel", "Annuler")}
        </Button>
        <Button type="submit" disabled={act.suggest.isPending}>
          {t("Send to Gecko", "Envoyer à Gecko")}
        </Button>
      </div>
    </form>
  );
}

/** Every cost that's been said yes to, line by line, with where it stands. */
function CostTable({ options }: { options: ProductionOption[] }) {
  const lines = options.filter((o) => isCommitted(o) && o.boughtBy === "gecko" && o.cost != null);
  if (lines.length === 0)
    return (
      <p className="muted">
        {t(
          "Nothing approved yet. Each talent, place or prop you approve shows up here with its cost.",
          "Rien de validé pour l'instant. Chaque talent, lieu ou accessoire validé s'affiche ici avec son coût.",
        )}
      </p>
    );
  const total = lines.reduce((n, o) => n + (o.cost ?? 0), 0);
  return (
    <table className="cost-table">
      <thead>
        <tr>
          <th scope="col">{t("What", "Quoi")}</th>
          <th scope="col">{t("Where it stands", "Où ça en est")}</th>
          <th scope="col" className="num">
            {t("Cost", "Coût")}
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((o) => (
          <tr key={o.id}>
            <td>
              <span className={`key key-${o.kind}`} aria-hidden="true" /> {o.name}
              <span className="muted small"> · {kindName(o.kind)}</span>
            </td>
            <td className="small">{statusName(o.status, "client")}</td>
            <td className="num">{dt(o.cost ?? 0)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={2}>
            {t("Total", "Total")}
          </th>
          <td className="num">{dt(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
