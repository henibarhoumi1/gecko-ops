import { t } from "@/lib/i18n";

export interface TourStep {
  /** What to point at; the step shows in the middle when it isn't on screen (a phone, a hidden item). */
  target?: string;
  title: string;
  text: string;
}

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The team tour: the sidebar from top to bottom. */
export function teamSteps(): TourStep[] {
  return [
    {
      title: "Welcome to Gecko World",
      text: "Thirty seconds to see where everything lives. The client sees the same screens, more polished.",
    },
    {
      target: ".side-search",
      title: "Search or jump",
      text: "Press ⌘K (Ctrl+K) anywhere to open a client, a page or a lead by typing.",
    },
    {
      target: '.side a[href="/today"]',
      title: "Today",
      text: "Your morning page: the next shoot, one line per client, tasks, and the leads to write to.",
    },
    {
      target: '.side a[href="/pipeline"]',
      title: "Pipeline",
      text: "Every lead with its next step. Open one to write the message, and turn it into a client when it's won.",
    },
    {
      target: '.side a[href="/clients"]',
      title: "Clients",
      text: "Each client by stage: Write (Writing room, ideas, scripts), Prep (tasks, shoot days), Review, Results.",
    },
    {
      target: '.side a[href="/shoots"]',
      title: "Shoots",
      text: "Every shoot day with its call sheet and the line reader for the set. Works offline.",
    },
    {
      target: '.side a[href="/trash"]',
      title: "Nothing is lost",
      text: "Every delete waits 7 days in the Trash, and Undo shows right after you remove something.",
    },
  ];
}

/** The client tour: the portal's rail, then where to start. */
export function clientSteps(): TourStep[] {
  return [
    {
      title: t("Welcome to your Gecko space", "Bienvenue dans votre espace Gecko"),
      text: t(
        "Everything about your videos, shared with the team: the same pages Gecko works on.",
        "Tout sur vos vidéos, partagé avec l'équipe : les mêmes pages que Gecko utilise.",
      ),
    },
    {
      target: '.portal-rail a[href$="/"]',
      title: t("Home", "Accueil"),
      text: t(
        "What's new since your last visit and what waits on you.",
        "Les nouveautés depuis votre dernière visite et ce qui vous attend.",
      ),
    },
    {
      target: '.portal-rail a[href$="/room"]',
      title: t("Writing room", "Atelier d'écriture"),
      text: t(
        "Every idea and script, from first idea to ready to shoot. Cards marked “Your turn” wait on you.",
        "Chaque idée et chaque script, de la première idée au tournage. Les cartes « À vous » vous attendent.",
      ),
    },
    {
      target: '.portal-rail a[href$="/brand"]',
      title: t("Brand sheet", "Fiche marque"),
      text: t(
        "Your brand on one page, from your onboarding answers. Every script is checked against it.",
        "Votre marque sur une page, à partir de vos réponses. Chaque script est vérifié avec elle.",
      ),
    },
    {
      target: '.portal-rail a[href$="/tasks"]',
      title: t("Tasks", "Tâches"),
      text: t(
        "One to-do list with Gecko. Add anything, tick it when it's done.",
        "Une seule liste avec Gecko. Ajoutez ce que vous voulez, cochez quand c'est fait.",
      ),
    },
    {
      target: ".rail-me",
      title: t("Language and you", "Langue et compte"),
      text: t(
        "Switch between English and French here. You can replay this tour any time.",
        "Passez de l'anglais au français ici. Vous pouvez revoir cette visite à tout moment.",
      ),
    },
  ];
}

/**
 * Where the card goes: under the target when there's room, otherwise above it, otherwise beside it,
 * always inside the window. Without a target, in the middle.
 */
export function placeCard(
  target: Box | null,
  card: { width: number; height: number },
  view: { width: number; height: number },
  gap = 12,
): { top: number; left: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const maxLeft = Math.max(gap, view.width - card.width - gap);
  const maxTop = Math.max(gap, view.height - card.height - gap);
  if (!target)
    return {
      top: clamp((view.height - card.height) / 2, gap, maxTop),
      left: clamp((view.width - card.width) / 2, gap, maxLeft),
    };
  const below = target.top + target.height + gap;
  const above = target.top - gap - card.height;
  const right = target.left + target.width + gap;
  if (right + card.width <= view.width - gap && target.left < view.width / 3)
    return { top: clamp(target.top, gap, maxTop), left: right };
  if (below + card.height <= view.height - gap)
    return { top: below, left: clamp(target.left, gap, maxLeft) };
  if (above >= gap) return { top: above, left: clamp(target.left, gap, maxLeft) };
  return { top: maxTop, left: clamp(target.left, gap, maxLeft) };
}
