import { useRef, useState, type RefObject } from "react";
import { Sheet } from "@/components/Sheet";
import { BANK, ideaBody } from "@/features/creative/bank";
import { FormatBank } from "@/features/creative/FormatBank";
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

/** Fills an idea form the way typing would (so it's kept as a draft). A field is only replaced when it's empty
 *  or still holds what a starter put there, never over the writer's own words. */
function fill(form: HTMLFormElement, values: Record<string, string>, ours: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) continue;
    const now = field.value.trim();
    if (now && now !== (ours[name] ?? "").trim()) continue;
    field.value = value;
    ours[name] = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/** The ways into a new idea: six quick starters, and the whole format bank one click away. */
export function IdeaStarters({ form }: { form: RefObject<HTMLFormElement | null> }) {
  const ours = useRef<Record<string, string>>({});
  const [bank, setBank] = useState(false);
  const put = (v: Record<string, string>) => form.current && fill(form.current, v, ours.current);
  return (
    <div className="idea-starters">
      <span className="small">{t("Start from:", "Partir de :")}</span>
      {starters().map((s) => (
        <button
          key={s.name}
          type="button"
          className="hook-idea"
          onClick={() => put({ title: s.title, hook: s.hook, body: s.body })}
        >
          {s.name}
        </button>
      ))}
      <button type="button" className="hook-idea is-bank" onClick={() => setBank(true)}>
        {t(`All ${BANK.length} formats`, `Les ${BANK.length} formats`)}
      </button>
      {bank && (
        <Sheet
          wide
          title={t("Format bank", "Banque de formats")}
          sub={t(
            "Formats that work on Reels, TikTok and Meta ads now. Pick one and the idea is laid out for you.",
            "Les formats qui marchent sur Reels, TikTok et Meta. Choisissez-en un, l'idée est posée pour vous.",
          )}
          onClose={() => setBank(false)}
        >
          <FormatBank
            useLabel={t("Start my idea from this", "Partir de ce format")}
            onUse={(f) => {
              put({ title: `${f.name}: `, hook: f.hooks[0] ?? "", body: ideaBody(f) });
              setBank(false);
            }}
          />
        </Sheet>
      )}
    </div>
  );
}
