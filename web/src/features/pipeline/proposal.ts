import { PLANS, type PlanId } from "@/features/plans/model";
import type { Lead } from "./model";

/** What the brand reads on the proposal page. */
export interface ProposalContent {
  lang: "en" | "fr";
  intro: string;
  goals: string[];
  plan: PlanId;
  price: number | null;
  reels: number | null;
  included: string[];
  timeline: string[];
  terms: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  content: Partial<ProposalContent>;
  hasLink: boolean;
  expiresAt: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  views: number;
  acceptedAt: string | null;
  acceptedName: string | null;
  author: string;
  createdAt: string;
  updatedAt: string;
}

const PACK_TO_PLAN: Record<string, PlanId> = {
  test: "test",
  "the test": "test",
  regular: "regular",
  pro: "pro",
  partner: "partner",
  "creative partner": "partner",
};

/** A first draft from what the lead already says: its pack, its value, its brand. */
export function draftProposal(
  lead: Pick<Lead, "brand" | "pack" | "value">,
  lang: "en" | "fr" = "fr",
): ProposalContent {
  const plan = PACK_TO_PLAN[(lead.pack ?? "").trim().toLowerCase()] ?? "test";
  const p = PLANS[plan];
  const fr = lang === "fr";
  return {
    lang,
    intro: fr
      ? `Voici ce que Gecko propose à ${lead.brand} : des vidéos courtes qui arrêtent le scroll et font vendre, écrites, tournées et montées par nous, validées par vous à chaque étape.`
      : `Here is what Gecko proposes for ${lead.brand}: short videos that stop the scroll and sell, written, shot and edited by us, approved by you at every step.`,
    goals: fr
      ? [
          "Plus de ventes depuis Instagram et TikTok",
          "Des vidéos à votre image, prêtes chaque mois",
        ]
      : ["More sales from Instagram and TikTok", "Videos that look like you, ready every month"],
    plan,
    price: lead.value != null && lead.value > 0 ? Number(lead.value) : p.price,
    reels: p.reels,
    included: [...p.included],
    timeline: fr
      ? [
          "Semaine 1 : onboarding (24 questions) et idées",
          "Semaine 2 : scripts validés et tournage",
          "Semaine 3 : montages, retours et livraison",
        ]
      : [
          "Week 1: onboarding (24 questions) and ideas",
          "Week 2: approved scripts and the shoot",
          "Week 3: edits, feedback and delivery",
        ],
    terms: fr
      ? "50 % à la validation, 50 % à la livraison. Prix de lancement valables jusqu'au 31 décembre 2026."
      : "50% on approval, 50% on delivery. Launch prices valid until 31 December 2026.",
  };
}

/** A stored proposal with every field filled, older or partial ones included. */
export function fullContent(
  c: Partial<ProposalContent>,
  lead: Pick<Lead, "brand" | "pack" | "value">,
): ProposalContent {
  const base = draftProposal(lead, c.lang === "en" ? "en" : "fr");
  const list = (v: unknown, fallback: string[]) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : fallback;
  return {
    lang: c.lang === "en" ? "en" : "fr",
    intro: typeof c.intro === "string" ? c.intro : base.intro,
    goals: list(c.goals, base.goals),
    plan: c.plan && c.plan in PLANS ? c.plan : base.plan,
    price: typeof c.price === "number" ? c.price : c.price === null ? null : base.price,
    reels: typeof c.reels === "number" ? c.reels : c.reels === null ? null : base.reels,
    included: list(c.included, base.included),
    timeline: list(c.timeline, base.timeline),
    terms: typeof c.terms === "string" ? c.terms : base.terms,
  };
}

/** "2 900 DT" the Tunisian way. */
export const money = (n: number | null, lang: "en" | "fr") =>
  n == null ? (lang === "fr" ? "Sur devis" : "On quote") : `${n.toLocaleString("fr-FR")} DT`;

/** The message that carries the link, in the proposal's language. */
export function proposalMessage(
  brand: string,
  link: string,
  lang: "en" | "fr",
  from: string,
): string {
  return lang === "fr"
    ? `Bonjour ${brand}, voici la proposition de Gecko comme convenu : ${link}\nVous pouvez l'accepter directement sur la page. Je reste dispo pour toute question. ${from}`
    : `Hi ${brand}, here is Gecko's proposal as promised: ${link}\nYou can accept it right on the page. Happy to answer any question. ${from}`;
}

export type ProposalState = "draft" | "sent" | "viewed" | "accepted" | "expired";

export function proposalState(
  p: Pick<Proposal, "hasLink" | "viewedAt" | "acceptedAt" | "expiresAt">,
  now = new Date(),
): ProposalState {
  if (p.acceptedAt) return "accepted";
  if (!p.hasLink) return "draft";
  if (p.expiresAt && new Date(p.expiresAt) <= now) return "expired";
  return p.viewedAt ? "viewed" : "sent";
}

/** Lines typed one per line, empty ones dropped. */
export const lines = (text: string) =>
  text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
