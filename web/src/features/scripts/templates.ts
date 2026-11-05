import { t } from "@/lib/i18n";
import type { ScriptStyle } from "./model";

/**
 * The script templates: proven short-form ad formats (TikTok, Reels, Shorts), each written as
 * Hook → Lead → Body → CTA. Grouped by what the ad is for, with the lengths each one works best at
 * and hook ideas to start from.
 */
export type TemplateGoal = "sell" | "trust" | "stop";

export interface Template {
  goal: TemplateGoal;
  /** When to pick it, in one line. */
  when: string;
  /** The lengths it works best at, in seconds. */
  best: [number, number];
  hook: string;
  lead: string;
  body: string[];
  cta: string;
  /** Hook lines to start from: tap one and it fills a hook option. */
  hooks: string[];
  /** The body parts stay as written at every length (a list of 3 reasons is still 3 reasons at 15 s). */
  fixed?: boolean;
}

export const GOAL_LABEL = (): Record<TemplateGoal, string> => ({
  sell: t("Sell now", "Vendre maintenant"),
  trust: t("Build trust", "Créer la confiance"),
  stop: t("Stop the scroll", "Arrêter le scroll"),
});

export const TEMPLATES: ScriptStyle[] = [
  "problem-fix",
  "before-after",
  "us-vs-them",
  "demo",
  "offer",
  "review",
  "founder",
  "reasons",
  "comment-reply",
  "bts",
  "pov",
  "skit",
  "storytime",
  "unboxing",
  "other",
];

function all(): Partial<Record<ScriptStyle, Template>> {
  return {
    "problem-fix": {
      goal: "sell",
      when: t("A clear pain the product solves.", "Un vrai problème que le produit règle."),
      best: [15, 30],
      hook: t("Name the pain in the first second. No product yet.", "Nommez le problème dès la première seconde. Pas encore de produit."),
      lead: t("Make it hurt: why this problem is so annoying.", "Faites-le ressentir : pourquoi ce problème est si pénible."),
      body: [
        t("The product steps in and fixes it, on camera.", "Le produit arrive et règle le problème, à l'écran."),
        t("The result, clearly visible.", "Le résultat, bien visible."),
      ],
      cta: t("What to do now, and why today.", "Quoi faire maintenant, et pourquoi aujourd'hui."),
      hooks: [
        t("Stop doing [the annoying thing] like this.", "Arrêtez de faire [la corvée] comme ça."),
        t("If [problem] drives you crazy, watch this.", "Si [problème] vous rend fou, regardez ça."),
        t("I wasted [time / money] on [problem] until this.", "J'ai perdu [temps / argent] avec [problème] jusqu'à ça."),
      ],
    },
    "before-after": {
      goal: "sell",
      when: t("The result can be seen.", "Le résultat se voit."),
      best: [9, 20],
      hook: t("Open on the after: the best-looking result first.", "Ouvrez sur l'après : le plus beau résultat d'abord."),
      lead: t("Rewind to the before. Same light, same frame.", "Retour à l'avant. Même lumière, même cadre."),
      body: [
        t("What changed: the product in use.", "Ce qui a changé : le produit en action."),
        t("Close-up proof of the result.", "La preuve du résultat, en gros plan."),
      ],
      cta: t("Get the same result: where and how.", "Obtenez le même résultat : où et comment."),
      hooks: [
        t("This took [time]. No filter.", "Ça a pris [durée]. Sans filtre."),
        t("Before / after with one [product].", "Avant / après avec un seul [produit]."),
        t("Wait for the after.", "Attendez l'après."),
      ],
    },
    "us-vs-them": {
      goal: "sell",
      when: t("You beat the usual option on something visible.", "Vous battez l'option habituelle sur un point visible."),
      best: [15, 30],
      hook: t("Side by side: the usual way vs yours.", "Côte à côte : la méthode habituelle contre la vôtre."),
      lead: t("Same test, same conditions. No tricks.", "Même test, mêmes conditions. Sans triche."),
      body: [
        t("Round 1: the difference people care about most.", "Round 1 : la différence qui compte le plus."),
        t("Round 2: the one they didn't expect.", "Round 2 : celle qu'on n'attendait pas."),
      ],
      cta: t("Why switch, and where to start.", "Pourquoi changer, et par où commencer."),
      hooks: [
        t("[Usual product] vs [your product]. Same test.", "[Produit habituel] contre [votre produit]. Même test."),
        t("I tested the cheap one and ours. Honest result.", "J'ai testé le moins cher et le nôtre. Résultat honnête."),
        t("Which one would you pick?", "Lequel vous choisiriez ?"),
      ],
    },
    demo: {
      goal: "sell",
      when: t("The product is satisfying or surprising to watch.", "Le produit est satisfaisant ou surprenant à regarder."),
      best: [15, 30],
      hook: t("The most satisfying moment of use, first.", "Le moment d'utilisation le plus satisfaisant, d'abord."),
      lead: t("What it is, in one line.", "Ce que c'est, en une phrase."),
      body: [
        t("How it works: step by step, hands on.", "Comment ça marche : étape par étape, en main."),
        t("The detail nobody expects.", "Le détail que personne n'attend."),
      ],
      cta: t("Where to get it.", "Où l'acheter."),
      hooks: [
        t("Watch what happens when I [action].", "Regardez ce qui se passe quand je [action]."),
        t("This is how [product] actually works.", "Voilà comment [produit] marche vraiment."),
        t("3 seconds. That's all it takes.", "3 secondes. C'est tout."),
      ],
    },
    offer: {
      goal: "sell",
      when: t("A real offer or a deadline.", "Une vraie offre ou une date limite."),
      best: [9, 15],
      hook: t("The offer itself, big and first.", "L'offre elle-même, en grand et en premier."),
      lead: t("What you get, shown, not listed.", "Ce qu'on reçoit, montré, pas listé."),
      body: [t("Why it's worth it: one strong reason.", "Pourquoi ça vaut le coup : une raison forte.")],
      cta: t("The deadline and how to get it.", "La date limite et comment en profiter."),
      hooks: [
        t("[Offer] until [date]. Only this week.", "[Offre] jusqu'au [date]. Cette semaine seulement."),
        t("First [number] orders get [bonus].", "Les [nombre] premières commandes reçoivent [bonus]."),
        t("Last day for this price.", "Dernier jour à ce prix."),
      ],
      fixed: true,
    },
    review: {
      goal: "trust",
      when: t("A real customer, or a creator, tries it.", "Un vrai client, ou un créateur, l'essaie."),
      best: [15, 45],
      hook: t("A real reaction: the first second of trying it.", "Une vraie réaction : la première seconde d'essai."),
      lead: t("My problem before.", "Mon problème avant."),
      body: [
        t("First try: what I noticed.", "Premier essai : ce que j'ai remarqué."),
        t("After a few days: the result.", "Après quelques jours : le résultat."),
      ],
      cta: t("Where to get it, in my own words.", "Où l'acheter, avec mes mots."),
      hooks: [
        t("I didn't expect this from [product].", "Je ne m'attendais pas à ça de [produit]."),
        t("Honest review after [time] of using it.", "Avis honnête après [durée] d'utilisation."),
        t("Is [product] worth it? Let's see.", "[Produit], ça vaut le coup ? On voit."),
      ],
    },
    founder: {
      goal: "trust",
      when: t("The person behind the brand is the story.", "La personne derrière la marque est l'histoire."),
      best: [30, 60],
      hook: t("A bold line from the founder, straight to camera.", "Une phrase forte du fondateur, face caméra."),
      lead: t("Why I started this.", "Pourquoi j'ai commencé."),
      body: [
        t("What makes it different from the rest.", "Ce qui le rend différent des autres."),
        t("Proof: a customer, a number, a moment.", "La preuve : un client, un chiffre, un moment."),
      ],
      cta: t("An invitation from the founder.", "Une invitation du fondateur."),
      hooks: [
        t("I started [brand] because [frustration].", "J'ai créé [marque] parce que [frustration]."),
        t("Everyone told me not to do this.", "Tout le monde m'a dit de ne pas le faire."),
        t("Here's what we do that nobody else does.", "Voilà ce qu'on fait et que personne ne fait."),
      ],
    },
    reasons: {
      goal: "trust",
      when: t("Several good reasons, none of them huge alone.", "Plusieurs bonnes raisons, aucune énorme seule."),
      best: [15, 30],
      hook: t("“3 reasons [who] love [product]”", "« 3 raisons pour lesquelles [qui] adorent [produit] »"),
      lead: t("Optional: who this is for.", "Facultatif : pour qui c'est."),
      body: [
        t("Reason 1, shown, not told.", "Raison 1, montrée, pas racontée."),
        t("Reason 2, shown.", "Raison 2, montrée."),
        t("Reason 3: the strongest, last.", "Raison 3 : la plus forte, en dernier."),
      ],
      cta: t("The easiest next step.", "L'étape suivante la plus simple."),
      hooks: [
        t("3 reasons [who] switched to [product].", "3 raisons pour lesquelles [qui] passent à [produit]."),
        t("3 things I wish I knew before buying [category].", "3 choses à savoir avant d'acheter [catégorie]."),
        t("Number 3 surprised me.", "La n°3 m'a surpris."),
      ],
      fixed: true,
    },
    "comment-reply": {
      goal: "trust",
      when: t("People keep asking the same question or doubt.", "On vous pose toujours la même question ou le même doute."),
      best: [15, 30],
      hook: t("A real comment on screen: “Replying to @…”", "Un vrai commentaire à l'écran : « Réponse à @… »"),
      lead: t("Repeat the doubt in your own words.", "Reformulez le doute avec vos mots."),
      body: [
        t("Answer it by showing, not arguing.", "Répondez en montrant, pas en argumentant."),
        t("The proof that settles it.", "La preuve qui règle la question."),
      ],
      cta: t("Invite the next question, or the order.", "Invitez la prochaine question, ou la commande."),
      hooks: [
        t("“Does it really work?” Let me show you.", "« Ça marche vraiment ? » Je vous montre."),
        t("“Why is it so expensive?” Fair question.", "« Pourquoi c'est si cher ? » Bonne question."),
        t("You asked, here's the answer.", "Vous avez demandé, voilà la réponse."),
      ],
    },
    bts: {
      goal: "trust",
      when: t("How it's made is impressive or human.", "La fabrication impressionne ou touche."),
      best: [15, 45],
      hook: t("The most surprising moment of making it.", "Le moment le plus surprenant de la fabrication."),
      lead: t("Where we are and who's doing it.", "Où on est et qui le fait."),
      body: [
        t("The process: the steps people never see.", "Le processus : les étapes qu'on ne voit jamais."),
        t("The care: the detail that shows quality.", "Le soin : le détail qui montre la qualité."),
      ],
      cta: t("From us to you: where to get it.", "De chez nous à chez vous : où l'acheter."),
      hooks: [
        t("This is how your [product] is made.", "Voilà comment votre [produit] est fait."),
        t("Nobody sees this part.", "Personne ne voit cette partie."),
        t("One order, start to finish.", "Une commande, du début à la fin."),
      ],
    },
    pov: {
      goal: "stop",
      when: t("A moment your customer instantly recognises.", "Un moment que votre client reconnaît tout de suite."),
      best: [7, 15],
      hook: t("“POV: [a relatable moment]” as text on screen.", "« POV : [un moment qu'on reconnaît] » en texte à l'écran."),
      lead: t("Play the moment from their eyes.", "Jouez le moment à travers ses yeux."),
      body: [t("The twist: the product changes the moment.", "Le twist : le produit change le moment.")],
      cta: t("A light line, then the product.", "Une phrase légère, puis le produit."),
      hooks: [
        t("POV: you finally found [solution].", "POV : vous avez enfin trouvé [solution]."),
        t("POV: guests arrive in 10 minutes.", "POV : les invités arrivent dans 10 minutes."),
        t("POV: your mum sees [result].", "POV : votre mère voit [résultat]."),
      ],
    },
    skit: {
      goal: "stop",
      when: t("A funny, true-to-life situation around the product.", "Une situation drôle et vraie autour du produit."),
      best: [15, 30],
      hook: t("Drop in mid-scene: the funniest line first.", "Entrez en pleine scène : la réplique la plus drôle d'abord."),
      lead: t("Who's who, in one beat.", "Qui est qui, en un temps."),
      body: [
        t("The situation gets worse.", "La situation empire."),
        t("The product saves the day, in character.", "Le produit sauve la situation, dans le rôle."),
      ],
      cta: t("A punchline that names the brand.", "Une chute qui nomme la marque."),
      hooks: [
        t("When your neighbour gets her [product] before you.", "Quand la voisine reçoit son [produit] avant vous."),
        t("Me explaining [product] to my mum.", "Moi qui explique [produit] à ma mère."),
        t("Types of people when [situation].", "Les types de personnes quand [situation]."),
      ],
    },
    storytime: {
      goal: "stop",
      when: t("A real story with a turn in it.", "Une vraie histoire avec un rebondissement."),
      best: [30, 60],
      hook: t("Start at the most dramatic moment.", "Commencez au moment le plus fort."),
      lead: t("Go back: how it started.", "Retour en arrière : comment ça a commencé."),
      body: [
        t("It gets worse.", "Ça empire."),
        t("The turn: what changed everything.", "Le tournant : ce qui a tout changé."),
        t("Where things are now.", "Où on en est maintenant."),
      ],
      cta: t("The lesson, and the product's part in it.", "La leçon, et le rôle du produit."),
      hooks: [
        t("I almost gave up on [thing]. Then this happened.", "J'ai failli abandonner [chose]. Puis c'est arrivé."),
        t("The day [unexpected thing] happened.", "Le jour où [chose inattendue] est arrivée."),
        t("Nobody believed me until [proof].", "Personne ne me croyait jusqu'à [preuve]."),
      ],
    },
    unboxing: {
      goal: "stop",
      when: t("The packaging or the first look is a moment.", "L'emballage ou la découverte est un moment."),
      best: [15, 30],
      hook: t("Hands on the box, a sound, the first reveal.", "Les mains sur la boîte, un son, la première découverte."),
      lead: t("What's in it, one thing at a time.", "Ce qu'il y a dedans, une chose à la fois."),
      body: [
        t("The detail that feels premium.", "Le détail qui fait premium."),
        t("First use, right away.", "Première utilisation, tout de suite."),
      ],
      cta: t("Get yours: where and how fast.", "Recevez le vôtre : où et en combien de temps."),
      hooks: [
        t("Unboxing the [product] everyone's asking about.", "Unboxing du [produit] dont tout le monde parle."),
        t("Look what just arrived.", "Regardez ce qui vient d'arriver."),
        t("The packaging alone…", "Rien que l'emballage…"),
      ],
    },
    other: {
      goal: "stop",
      when: t("Your own structure.", "Votre propre structure."),
      best: [5, 180],
      hook: t("Stop the scroll in the first second.", "Arrêtez le scroll dès la première seconde."),
      lead: t("Set up the problem or the promise.", "Posez le problème ou la promesse."),
      body: [t("Show it.", "Montrez-le."), t("Prove it.", "Prouvez-le.")],
      cta: t("One clear next step.", "Une seule étape suivante, claire."),
      hooks: [],
    },
  };
}

export function template(style: ScriptStyle): Template {
  const list = all();
  return list[style] ?? list.other!;
}

/** Hook types that work for any template: tap one to start from it. */
export function anyHooks(): string[] {
  return [
    t("[Number] [result] in [time].", "[Chiffre] [résultat] en [durée]."),
    t("Nobody talks about this, but…", "Personne n'en parle, mais…"),
    t("If you [who you're for], watch this.", "Si vous êtes [cible], regardez ça."),
    t("[Number] people already switched. Here's why.", "[Nombre] personnes ont déjà changé. Voilà pourquoi."),
  ];
}

/**
 * The body parts for a video length. Short videos keep the essential part, long ones get room for
 * more proof. Templates marked `fixed` keep their parts at every length.
 */
export function bodyFor(tpl: Template, seconds: number): string[] {
  if (tpl.fixed) return tpl.body;
  if (seconds <= 20) return tpl.body.slice(0, 1);
  if (seconds > 40 && tpl.body.length < 4)
    return [
      ...tpl.body,
      t("More proof: another angle, a customer, a close-up.", "Encore une preuve : un autre angle, un client, un gros plan."),
    ];
  return tpl.body;
}

/** Roughly when each part plays, for a video of this length: [hook, lead, ...body, cta] as "0–3 s". */
export function partTimes(seconds: number, bodyParts: number): string[] {
  const s = Math.max(5, seconds);
  // The hook and the CTA keep their length; the lead and the body share the middle.
  const hook = Math.min(3, s * 0.2);
  const cta = s <= 15 ? 2 : s <= 30 ? 3 : 5;
  const middle = Math.max(1, s - hook - cta);
  const n = Math.max(1, bodyParts);
  const lead = middle * 0.2;
  const each = (middle - lead) / n;
  const lengths = [hook, lead, ...Array.from({ length: n }, () => each), cta];
  let at = 0;
  return lengths.map((len) => {
    const from = Math.round(at);
    at += len;
    return `${from}–${Math.round(at)} s`;
  });
}
