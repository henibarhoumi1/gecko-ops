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
  "street-interview",
  "tutorial",
  "trend",
  "myth-fact",
  "day-in-life",
  "product-only",
  "reaction",
  "brand-film",
  "teaser",
  "portrait",
  "other",
];

function all(): Partial<Record<ScriptStyle, Template>> {
  return {
    "problem-fix": {
      goal: "sell",
      when: t("A clear pain the product solves.", "Un vrai problème que le produit règle."),
      best: [15, 30],
      hook: t(
        "Name the pain in the first second. No product yet.",
        "Nommez le problème dès la première seconde. Pas encore de produit.",
      ),
      lead: t(
        "Make it hurt: why this problem is so annoying.",
        "Faites-le ressentir : pourquoi ce problème est si pénible.",
      ),
      body: [
        t(
          "The product steps in and fixes it, on camera.",
          "Le produit arrive et règle le problème, à l'écran.",
        ),
        t("The result, clearly visible.", "Le résultat, bien visible."),
      ],
      cta: t("What to do now, and why today.", "Quoi faire maintenant, et pourquoi aujourd'hui."),
      hooks: [
        t("Stop doing [the annoying thing] like this.", "Arrêtez de faire [la corvée] comme ça."),
        t(
          "If [problem] drives you crazy, watch this.",
          "Si [problème] vous rend fou, regardez ça.",
        ),
        t(
          "I wasted [time / money] on [problem] until this.",
          "J'ai perdu [temps / argent] avec [problème] jusqu'à ça.",
        ),
      ],
    },
    "before-after": {
      goal: "sell",
      when: t("The result can be seen.", "Le résultat se voit."),
      best: [9, 20],
      hook: t(
        "Open on the after: the best-looking result first.",
        "Ouvrez sur l'après : le plus beau résultat d'abord.",
      ),
      lead: t(
        "Rewind to the before. Same light, same frame.",
        "Retour à l'avant. Même lumière, même cadre.",
      ),
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
      when: t(
        "You beat the usual option on something visible.",
        "Vous battez l'option habituelle sur un point visible.",
      ),
      best: [15, 30],
      hook: t(
        "Side by side: the usual way vs yours.",
        "Côte à côte : la méthode habituelle contre la vôtre.",
      ),
      lead: t(
        "Same test, same conditions. No tricks.",
        "Même test, mêmes conditions. Sans triche.",
      ),
      body: [
        t(
          "Round 1: the difference people care about most.",
          "Round 1 : la différence qui compte le plus.",
        ),
        t("Round 2: the one they didn't expect.", "Round 2 : celle qu'on n'attendait pas."),
      ],
      cta: t("Why switch, and where to start.", "Pourquoi changer, et par où commencer."),
      hooks: [
        t(
          "[Usual product] vs [your product]. Same test.",
          "[Produit habituel] contre [votre produit]. Même test.",
        ),
        t(
          "I tested the cheap one and ours. Honest result.",
          "J'ai testé le moins cher et le nôtre. Résultat honnête.",
        ),
        t("Which one would you pick?", "Lequel vous choisiriez ?"),
      ],
    },
    demo: {
      goal: "sell",
      when: t(
        "The product is satisfying or surprising to watch.",
        "Le produit est satisfaisant ou surprenant à regarder.",
      ),
      best: [15, 30],
      hook: t(
        "The most satisfying moment of use, first.",
        "Le moment d'utilisation le plus satisfaisant, d'abord.",
      ),
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
      body: [
        t("Why it's worth it: one strong reason.", "Pourquoi ça vaut le coup : une raison forte."),
      ],
      cta: t("The deadline and how to get it.", "La date limite et comment en profiter."),
      hooks: [
        t(
          "[Offer] until [date]. Only this week.",
          "[Offre] jusqu'au [date]. Cette semaine seulement.",
        ),
        t(
          "First [number] orders get [bonus].",
          "Les [nombre] premières commandes reçoivent [bonus].",
        ),
        t("Last day for this price.", "Dernier jour à ce prix."),
      ],
      fixed: true,
    },
    review: {
      goal: "trust",
      when: t(
        "A real customer, or a creator, tries it.",
        "Un vrai client, ou un créateur, l'essaie.",
      ),
      best: [15, 45],
      hook: t(
        "A real reaction: the first second of trying it.",
        "Une vraie réaction : la première seconde d'essai.",
      ),
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
      when: t(
        "The person behind the brand is the story.",
        "La personne derrière la marque est l'histoire.",
      ),
      best: [30, 60],
      hook: t(
        "A bold line from the founder, straight to camera.",
        "Une phrase forte du fondateur, face caméra.",
      ),
      lead: t("Why I started this.", "Pourquoi j'ai commencé."),
      body: [
        t("What makes it different from the rest.", "Ce qui le rend différent des autres."),
        t(
          "Proof: a customer, a number, a moment.",
          "La preuve : un client, un chiffre, un moment.",
        ),
      ],
      cta: t("An invitation from the founder.", "Une invitation du fondateur."),
      hooks: [
        t(
          "I started [brand] because [frustration].",
          "J'ai créé [marque] parce que [frustration].",
        ),
        t("Everyone told me not to do this.", "Tout le monde m'a dit de ne pas le faire."),
        t(
          "Here's what we do that nobody else does.",
          "Voilà ce qu'on fait et que personne ne fait.",
        ),
      ],
    },
    reasons: {
      goal: "trust",
      when: t(
        "Several good reasons, none of them huge alone.",
        "Plusieurs bonnes raisons, aucune énorme seule.",
      ),
      best: [15, 30],
      hook: t(
        "“3 reasons [who] love [product]”",
        "« 3 raisons pour lesquelles [qui] adorent [produit] »",
      ),
      lead: t("Optional: who this is for.", "Facultatif : pour qui c'est."),
      body: [
        t("Reason 1, shown, not told.", "Raison 1, montrée, pas racontée."),
        t("Reason 2, shown.", "Raison 2, montrée."),
        t("Reason 3: the strongest, last.", "Raison 3 : la plus forte, en dernier."),
      ],
      cta: t("The easiest next step.", "L'étape suivante la plus simple."),
      hooks: [
        t(
          "3 reasons [who] switched to [product].",
          "3 raisons pour lesquelles [qui] passent à [produit].",
        ),
        t(
          "3 things I wish I knew before buying [category].",
          "3 choses à savoir avant d'acheter [catégorie].",
        ),
        t("Number 3 surprised me.", "La n°3 m'a surpris."),
      ],
      fixed: true,
    },
    "comment-reply": {
      goal: "trust",
      when: t(
        "People keep asking the same question or doubt.",
        "On vous pose toujours la même question ou le même doute.",
      ),
      best: [15, 30],
      hook: t(
        "A real comment on screen: “Replying to @…”",
        "Un vrai commentaire à l'écran : « Réponse à @… »",
      ),
      lead: t("Repeat the doubt in your own words.", "Reformulez le doute avec vos mots."),
      body: [
        t("Answer it by showing, not arguing.", "Répondez en montrant, pas en argumentant."),
        t("The proof that settles it.", "La preuve qui règle la question."),
      ],
      cta: t(
        "Invite the next question, or the order.",
        "Invitez la prochaine question, ou la commande.",
      ),
      hooks: [
        t("“Does it really work?” Let me show you.", "« Ça marche vraiment ? » Je vous montre."),
        t(
          "“Why is it so expensive?” Fair question.",
          "« Pourquoi c'est si cher ? » Bonne question.",
        ),
        t("You asked, here's the answer.", "Vous avez demandé, voilà la réponse."),
      ],
    },
    bts: {
      goal: "trust",
      when: t("How it's made is impressive or human.", "La fabrication impressionne ou touche."),
      best: [15, 45],
      hook: t(
        "The most surprising moment of making it.",
        "Le moment le plus surprenant de la fabrication.",
      ),
      lead: t("Where we are and who's doing it.", "Où on est et qui le fait."),
      body: [
        t(
          "The process: the steps people never see.",
          "Le processus : les étapes qu'on ne voit jamais.",
        ),
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
      when: t(
        "A moment your customer instantly recognises.",
        "Un moment que votre client reconnaît tout de suite.",
      ),
      best: [7, 15],
      hook: t(
        "“POV: [a relatable moment]” as text on screen.",
        "« POV : [un moment qu'on reconnaît] » en texte à l'écran.",
      ),
      lead: t("Play the moment from their eyes.", "Jouez le moment à travers ses yeux."),
      body: [
        t("The twist: the product changes the moment.", "Le twist : le produit change le moment."),
      ],
      cta: t("A light line, then the product.", "Une phrase légère, puis le produit."),
      hooks: [
        t("POV: you finally found [solution].", "POV : vous avez enfin trouvé [solution]."),
        t("POV: guests arrive in 10 minutes.", "POV : les invités arrivent dans 10 minutes."),
        t("POV: your mum sees [result].", "POV : votre mère voit [résultat]."),
      ],
    },
    skit: {
      goal: "stop",
      when: t(
        "A funny, true-to-life situation around the product.",
        "Une situation drôle et vraie autour du produit.",
      ),
      best: [15, 30],
      hook: t(
        "Drop in mid-scene: the funniest line first.",
        "Entrez en pleine scène : la réplique la plus drôle d'abord.",
      ),
      lead: t("Who's who, in one beat.", "Qui est qui, en un temps."),
      body: [
        t("The situation gets worse.", "La situation empire."),
        t(
          "The product saves the day, in character.",
          "Le produit sauve la situation, dans le rôle.",
        ),
      ],
      cta: t("A punchline that names the brand.", "Une chute qui nomme la marque."),
      hooks: [
        t(
          "When your neighbour gets her [product] before you.",
          "Quand la voisine reçoit son [produit] avant vous.",
        ),
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
        t(
          "I almost gave up on [thing]. Then this happened.",
          "J'ai failli abandonner [chose]. Puis c'est arrivé.",
        ),
        t("The day [unexpected thing] happened.", "Le jour où [chose inattendue] est arrivée."),
        t("Nobody believed me until [proof].", "Personne ne me croyait jusqu'à [preuve]."),
      ],
    },
    unboxing: {
      goal: "stop",
      when: t(
        "The packaging or the first look is a moment.",
        "L'emballage ou la découverte est un moment.",
      ),
      best: [15, 30],
      hook: t(
        "Hands on the box, a sound, the first reveal.",
        "Les mains sur la boîte, un son, la première découverte.",
      ),
      lead: t("What's in it, one thing at a time.", "Ce qu'il y a dedans, une chose à la fois."),
      body: [
        t("The detail that feels premium.", "Le détail qui fait premium."),
        t("First use, right away.", "Première utilisation, tout de suite."),
      ],
      cta: t("Get yours: where and how fast.", "Recevez le vôtre : où et en combien de temps."),
      hooks: [
        t(
          "Unboxing the [product] everyone's asking about.",
          "Unboxing du [produit] dont tout le monde parle.",
        ),
        t("Look what just arrived.", "Regardez ce qui vient d'arriver."),
        t("The packaging alone…", "Rien que l'emballage…"),
      ],
    },
    "street-interview": {
      goal: "trust",
      when: t(
        "Real people on camera say what you want customers to hear.",
        "De vraies personnes disent face caméra ce que vos clients doivent entendre.",
      ),
      best: [20, 45],
      hook: t(
        "A mic in a stranger's face and a question everyone has an opinion on.",
        "Un micro tendu à un passant et une question sur laquelle tout le monde a un avis.",
      ),
      lead: t(
        "Two or three quick answers: honest, funny, unexpected.",
        "Deux ou trois réponses rapides : sincères, drôles, inattendues.",
      ),
      body: [
        t(
          "Hand them the product: their first reaction, unscripted.",
          "On leur donne le produit : leur première réaction, sans script.",
        ),
        t(
          "The best line from a passer-by, said in their own words.",
          "La meilleure phrase d'un passant, avec ses propres mots.",
        ),
      ],
      cta: t(
        "Ask the viewer the same question, then where to try it.",
        "Posez la même question au spectateur, puis où l'essayer.",
      ),
      hooks: [
        t(
          "We asked people in [city]: [question]?",
          "On a demandé aux gens de [ville] : [question] ?",
        ),
        t(
          "Can strangers tell [ours] from [theirs]?",
          "Les passants font-ils la différence entre [nous] et [eux] ?",
        ),
        t(
          "Rating [product] with people on the street.",
          "On note [produit] avec les gens dans la rue.",
        ),
      ],
    },
    tutorial: {
      goal: "trust",
      when: t(
        "The product needs a little know-how, or makes something easier.",
        "Le produit demande un petit savoir-faire, ou rend quelque chose plus simple.",
      ),
      best: [20, 60],
      hook: t(
        "Promise the result first: what they'll know how to do in a minute.",
        "Promettez le résultat d'abord : ce qu'ils sauront faire en une minute.",
      ),
      lead: t("What you need, all in one shot.", "Ce qu'il faut, tout dans un seul plan."),
      body: [
        t("Step 1, close up, one action.", "Étape 1, en gros plan, un seul geste."),
        t(
          "Step 2, with the trick most people miss.",
          "Étape 2, avec l'astuce que tout le monde rate.",
        ),
        t("The finished result.", "Le résultat fini."),
      ],
      cta: t(
        "Save it for later, and where to get what you used.",
        "Enregistrez pour plus tard, et où trouver ce qu'on a utilisé.",
      ),
      hooks: [
        t("How to [result] in [number] steps.", "Comment [résultat] en [chiffre] étapes."),
        t(
          "You've been [doing it] wrong. Here's how.",
          "Vous [le faites] mal depuis le début. Voilà comment.",
        ),
        t(
          "The [number]-second trick for [result].",
          "L'astuce de [chiffre] secondes pour [résultat].",
        ),
      ],
    },
    trend: {
      goal: "stop",
      when: t(
        "A sound or format is everywhere this week and fits the brand.",
        "Un son ou un format est partout cette semaine et colle à la marque.",
      ),
      best: [7, 20],
      hook: t(
        "Start exactly like the trend so people recognise it in one second.",
        "Commencez exactement comme la tendance pour qu'on la reconnaisse en une seconde.",
      ),
      lead: t(
        "The setup everyone knows, with the brand's world around it.",
        "La mise en place que tout le monde connaît, dans l'univers de la marque.",
      ),
      body: [t("The twist: the product is the punchline.", "Le twist : le produit est la chute.")],
      cta: t(
        "Short and light: follow, or the product name on screen.",
        "Court et léger : suivez-nous, ou le nom du produit à l'écran.",
      ),
      hooks: [
        t("[Trend sound] but it's [brand].", "[Son tendance] mais version [marque]."),
        t(
          "Tell me you [use product] without telling me.",
          "Dis-moi que tu [utilises le produit] sans me le dire.",
        ),
        t("POV: [trend setup] with [product].", "POV : [situation tendance] avec [produit]."),
      ],
      fixed: true,
    },
    "myth-fact": {
      goal: "trust",
      when: t(
        "People believe something wrong about your product or your category.",
        "Les gens croient quelque chose de faux sur votre produit ou votre secteur.",
      ),
      best: [15, 40],
      hook: t(
        "Say the myth out loud, like everyone believes it.",
        "Dites le mythe à voix haute, comme tout le monde y croit.",
      ),
      lead: t(
        "Why people think that. Don't mock them.",
        "Pourquoi les gens le pensent. Sans s'en moquer.",
      ),
      body: [
        t("The fact, shown, not just said.", "La réalité, montrée, pas juste dite."),
        t(
          "What it means for the viewer, with the product.",
          "Ce que ça change pour le spectateur, avec le produit.",
        ),
      ],
      cta: t(
        "One more myth in the comments, and where to see for themselves.",
        "Un autre mythe en commentaire, et où vérifier par eux-mêmes.",
      ),
      hooks: [
        t("Myth: [wrong belief]. Fact:", "Mythe : [idée reçue]. Réalité :"),
        t("Stop believing [myth].", "Arrêtez de croire que [mythe]."),
        t("Everyone says [myth]. Let's check.", "Tout le monde dit que [mythe]. On vérifie."),
      ],
    },
    "day-in-life": {
      goal: "trust",
      when: t(
        "The product fits into a real routine, or the team's day is interesting.",
        "Le produit s'intègre dans une vraie routine, ou la journée de l'équipe intéresse.",
      ),
      best: [20, 60],
      hook: t(
        "A time on screen and a moment people relate to.",
        "Une heure à l'écran et un moment auquel on s'identifie.",
      ),
      lead: t(
        "Who this is and what their day looks like.",
        "Qui c'est et à quoi ressemble sa journée.",
      ),
      body: [
        t("Morning: where the product first shows up.", "Le matin : là où le produit apparaît."),
        t("Midday: the moment it really helps.", "Le midi : le moment où il aide vraiment."),
        t(
          "Evening: how the day ends, thanks to it.",
          "Le soir : comment la journée se termine, grâce à lui.",
        ),
      ],
      cta: t(
        "Make it part of your day: where to get it.",
        "Faites-en une partie de votre journée : où le trouver.",
      ),
      hooks: [
        t("A day in my life as [who].", "Une journée dans ma vie de [qui]."),
        t("6:30 am, [city]. Let's go.", "6 h 30, [ville]. C'est parti."),
        t(
          "What a [job] actually does all day.",
          "Ce que fait vraiment un [métier] toute la journée.",
        ),
      ],
    },
    "product-only": {
      goal: "sell",
      when: t(
        "No face on camera: the product, hands and good light do the work.",
        "Pas de visage à l'écran : le produit, des mains et une belle lumière font le travail.",
      ),
      best: [6, 20],
      hook: t(
        "One striking shot: a pour, a drop, a reveal, a satisfying sound.",
        "Un plan marquant : un versement, une chute, une révélation, un son satisfaisant.",
      ),
      lead: t(
        "The product in full, turning, in its best light.",
        "Le produit en entier, qui tourne, sous son meilleur jour.",
      ),
      body: [
        t("Texture and detail, very close.", "Matière et détails, très près."),
        t("In use, in a few quick cuts.", "En action, en quelques plans rapides."),
      ],
      cta: t(
        "Name, price or offer, and where, on the last frame.",
        "Nom, prix ou offre, et où, sur le dernier plan.",
      ),
      hooks: [
        t("[Sound] + [product] on screen. No words.", "[Son] + [produit] à l'écran. Sans un mot."),
        t("The most satisfying [product] shot.", "Le plan de [produit] le plus satisfaisant."),
        t("[Product], in [number] seconds.", "[Produit], en [chiffre] secondes."),
      ],
    },
    reaction: {
      goal: "stop",
      when: t(
        "Someone trying the product for the first time is the story.",
        "Quelqu'un qui découvre le produit, c'est ça l'histoire.",
      ),
      best: [10, 30],
      hook: t(
        "Open on the face at the best moment of the reaction.",
        "Ouvrez sur le visage au meilleur moment de la réaction.",
      ),
      lead: t("Back to the start: what they expected.", "Retour au début : ce qu'ils attendaient."),
      body: [
        t("The first try, real time, no cut.", "Le premier essai, en temps réel, sans coupe."),
        t(
          "What they say right after, in their words.",
          "Ce qu'ils disent juste après, avec leurs mots.",
        ),
      ],
      cta: t("Try it yourself: where and how.", "Essayez vous-même : où et comment."),
      hooks: [
        t(
          "My [mum / friend] tries [product] for the first time.",
          "Ma [mère / pote] teste [produit] pour la première fois.",
        ),
        t("Wait for their face.", "Attendez de voir sa tête."),
        t("They didn't believe me until…", "Ils ne me croyaient pas jusqu'à…"),
      ],
    },
    "brand-film": {
      goal: "trust",
      when: t(
        "A launch, an anniversary, or the brand needs a story more than a sale.",
        "Un lancement, un anniversaire, ou la marque a besoin d'une histoire plus que d'une vente.",
      ),
      best: [30, 90],
      hook: t(
        "One image or line that sets the feeling, before any product.",
        "Une image ou une phrase qui pose l'émotion, avant tout produit.",
      ),
      lead: t(
        "The world the brand lives in: place, people, sound.",
        "L'univers de la marque : un lieu, des gens, un son.",
      ),
      body: [
        t(
          "What the brand believes, shown through people.",
          "Ce en quoi la marque croit, montré par des gens.",
        ),
        t(
          "The product as part of that world, never forced.",
          "Le produit dans cet univers, jamais forcé.",
        ),
        t("The moment the feeling peaks.", "Le moment où l'émotion culmine."),
      ],
      cta: t(
        "The brand line and the logo. Nothing else.",
        "La signature et le logo. Rien d'autre.",
      ),
      hooks: [
        t("[City] wakes up at [time].", "[Ville] se réveille à [heure]."),
        t(
          "Some things take [number] years to make.",
          "Certaines choses prennent [chiffre] ans à faire.",
        ),
        t("This is for everyone who [belief].", "Pour tous ceux qui [conviction]."),
      ],
    },
    teaser: {
      goal: "stop",
      when: t(
        "Something is coming: a launch, a drop, an event.",
        "Quelque chose arrive : un lancement, une sortie, un événement.",
      ),
      best: [6, 15],
      hook: t(
        "Show a piece of it, never the whole thing.",
        "Montrez-en un morceau, jamais le tout.",
      ),
      lead: t(
        "One clue: a shape, a colour, a sound.",
        "Un indice : une forme, une couleur, un son.",
      ),
      body: [t("The date, big and clear.", "La date, en grand et bien lisible.")],
      cta: t(
        "Follow or turn on notifications so they don't miss it.",
        "Abonnez-vous ou activez les notifications pour ne pas le rater.",
      ),
      hooks: [
        t("Something new is coming on [date].", "Quelque chose de nouveau arrive le [date]."),
        t("You're not ready for [hint].", "Vous n'êtes pas prêts pour [indice]."),
        t("[Number] days.", "J-[chiffre]."),
      ],
      fixed: true,
    },
    portrait: {
      goal: "trust",
      when: t(
        "A real person behind the brand: a maker, a customer, a team member.",
        "Une vraie personne derrière la marque : un artisan, un client, un membre de l'équipe.",
      ),
      best: [30, 90],
      hook: t(
        "Their face and one line that makes you want to know them.",
        "Leur visage et une phrase qui donne envie de les connaître.",
      ),
      lead: t("Who they are, in their own words.", "Qui ils sont, avec leurs mots."),
      body: [
        t("What they do, shown with their hands.", "Ce qu'ils font, montré avec leurs mains."),
        t("Why it matters to them.", "Pourquoi ça compte pour eux."),
        t("Where the brand fits in their story.", "La place de la marque dans leur histoire."),
      ],
      cta: t(
        "Meet more of them, or the product they made, and where.",
        "Découvrez-en d'autres, ou le produit qu'ils font, et où.",
      ),
      hooks: [
        t("Meet [name]. [One surprising fact].", "Voici [prénom]. [Un fait surprenant]."),
        t(
          "[Name] has been [doing this] for [number] years.",
          "[Prénom] [fait ça] depuis [chiffre] ans.",
        ),
        t(
          "Nobody sees who makes your [product].",
          "Personne ne voit qui fabrique votre [produit].",
        ),
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
    t(
      "[Number] people already switched. Here's why.",
      "[Nombre] personnes ont déjà changé. Voilà pourquoi.",
    ),
  ];
}

/** The hook library: proven openers by type, for any template. Tap one to start from it. */
export function hookLibrary(): { name: string; hooks: string[] }[] {
  return [
    {
      name: t("Question", "Question"),
      hooks: [
        t("Why does nobody talk about [thing]?", "Pourquoi personne ne parle de [chose] ?"),
        t("Would you pay [price] for [result]?", "Vous paieriez [prix] pour [résultat] ?"),
        t("Is [product] actually worth it?", "Est-ce que [produit] vaut vraiment le coup ?"),
      ],
    },
    {
      name: t("Number", "Chiffre"),
      hooks: [
        t(
          "[Number] things I wish I knew about [topic].",
          "[Chiffre] choses que j'aurais aimé savoir sur [sujet].",
        ),
        t(
          "We sold [number] in [time]. Here's why.",
          "On en a vendu [chiffre] en [durée]. Voilà pourquoi.",
        ),
        t("[Number] seconds to [result].", "[Chiffre] secondes pour [résultat]."),
      ],
    },
    {
      name: t("Warning", "Alerte"),
      hooks: [
        t(
          "Don't buy [category] before watching this.",
          "N'achetez pas de [catégorie] avant de voir ça.",
        ),
        t("Stop [common habit]. Seriously.", "Arrêtez de [habitude]. Sérieusement."),
        t(
          "The mistake everyone makes with [thing].",
          "L'erreur que tout le monde fait avec [chose].",
        ),
      ],
    },
    {
      name: t("Curiosity", "Curiosité"),
      hooks: [
        t("I didn't expect this from [product].", "Je ne m'attendais pas à ça de [produit]."),
        t("Watch until the end.", "Regardez jusqu'à la fin."),
        t("This is the secret behind [result].", "Voilà le secret derrière [résultat]."),
      ],
    },
    {
      name: t("Relatable", "Ça parle à tous"),
      hooks: [
        t("Tell me you're [who] without telling me.", "Dis-moi que tu es [qui] sans me le dire."),
        t("Every [who] knows this feeling.", "Tous les [qui] connaissent ça."),
        t("Me, every time [situation]:", "Moi, à chaque fois que [situation] :"),
      ],
    },
    {
      name: t("Proof", "Preuve"),
      hooks: [
        t("[Number] reviews can't be wrong.", "[Chiffre] avis ne peuvent pas se tromper."),
        t(
          "I tested [product] for [time]. Honest review.",
          "J'ai testé [produit] pendant [durée]. Avis honnête.",
        ),
        t("Real result, no filter, day [number].", "Vrai résultat, sans filtre, jour [chiffre]."),
      ],
    },
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
      t(
        "More proof: another angle, a customer, a close-up.",
        "Encore une preuve : un autre angle, un client, un gros plan.",
      ),
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
