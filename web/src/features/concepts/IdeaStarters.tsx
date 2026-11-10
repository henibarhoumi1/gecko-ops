import type { RefObject } from "react";
import { t } from "@/lib/i18n";

/** Ways into an idea when the page is blank: each fills the title, a hook and a few prompts to answer. */
export function starters(): { name: string; title: string; hook: string; body: string }[] {
  return [
    {
      name: t("A customer's story", "L'histoire d'un client"),
      title: t("How [customer] [result]", "Comment [client] [résultat]"),
      hook: t("She tried everything before this.", "Elle avait tout essayé avant ça."),
      body: t(
        "Who: \nTheir problem before: \nThe moment it changed: \nWhat they'd tell a friend: ",
        "Qui : \nSon problème avant : \nLe moment où tout a changé : \nCe qu'elle dirait à une amie : ",
      ),
    },
    {
      name: t("Behind the scenes", "Les coulisses"),
      title: t("How we make [product]", "Comment on fabrique [produit]"),
      hook: t("Nobody sees this part.", "Personne ne voit cette partie."),
      body: t(
        "Where: \nWho we see: \nThe detail that surprises: \nThe proud moment: ",
        "Où : \nQui on voit : \nLe détail qui surprend : \nLe moment de fierté : ",
      ),
    },
    {
      name: t("Before / after", "Avant / après"),
      title: t("[Problem] → [result]", "[Problème] → [résultat]"),
      hook: t("Watch this disappear.", "Regardez ça disparaître."),
      body: t(
        "Before (show it): \nWhat we do: \nAfter (show it): \nHow long it took: ",
        "Avant (à montrer) : \nCe qu'on fait : \nAprès (à montrer) : \nEn combien de temps : ",
      ),
    },
    {
      name: t("A trend, our way", "Une tendance, à notre façon"),
      title: t("[Trend] but it's [brand]", "[Tendance] version [marque]"),
      hook: t("POV: ", "POV : "),
      body: t(
        "The trend (paste a link below): \nOur twist: \nWhere the product comes in: ",
        "La tendance (collez un lien plus bas) : \nNotre twist : \nOù le produit arrive : ",
      ),
    },
    {
      name: t("Myth vs fact", "Mythe ou réalité"),
      title: t("Stop believing [myth]", "Arrêtez de croire que [mythe]"),
      hook: t("Everyone says this. It's wrong.", "Tout le monde dit ça. C'est faux."),
      body: t(
        "The myth: \nWhy people believe it: \nThe fact, shown: \nWhat it changes for them: ",
        "Le mythe : \nPourquoi on y croit : \nLa réalité, montrée : \nCe que ça change pour eux : ",
      ),
    },
    {
      name: t("A question we get", "Une question qu'on nous pose"),
      title: t("You asked: [question]", "Vous nous demandez : [question]"),
      hook: t("We get this question every day.", "On nous pose cette question tous les jours."),
      body: t(
        "The question, word for word: \nThe short answer: \nThe proof: ",
        "La question, mot pour mot : \nLa réponse courte : \nLa preuve : ",
      ),
    },
  ];
}

/** Fills the empty fields of an idea form from a starter, the way typing would (so it's kept as a draft). */
function fill(form: HTMLFormElement, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) continue;
    if (field.value.trim()) continue;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/** The starter chips above a new idea. */
export function IdeaStarters({ form }: { form: RefObject<HTMLFormElement | null> }) {
  return (
    <div className="idea-starters">
      <span className="small">{t("Start from:", "Partir de :")}</span>
      {starters().map((s) => (
        <button
          key={s.name}
          type="button"
          className="hook-idea"
          onClick={() =>
            form.current && fill(form.current, { title: s.title, hook: s.hook, body: s.body })
          }
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}
