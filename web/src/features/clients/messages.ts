/** Ready-to-send messages for the client, in English or French. Gecko sends them on WhatsApp. */
export type MsgLang = "en" | "fr";

export function inviteMessage(lang: MsgLang, brand: string, url: string): string {
  return lang === "fr"
    ? `Bonjour ! Votre espace ${brand} × Gecko est prêt : ${url}\nOuvrez le lien, entrez votre nom et choisissez un mot de passe : ce sera votre accès, sur téléphone comme sur ordinateur. Toute la campagne s'y trouve : les idées et les scripts à valider, le plan du tournage, et bientôt vos vidéos.`
    : `Hi! Your ${brand} × Gecko portal is ready: ${url}\nOpen the link, type your name and choose a password. That's your login from now on, on your phone or computer. Everything for the campaign lives there: ideas and scripts to approve, the shoot plan, and soon your videos.`;
}

function count(lang: MsgLang, n: number, en: [string, string], fr: [string, string]): string {
  return `${n} ${lang === "fr" ? (n > 1 ? fr[1] : fr[0]) : n === 1 ? en[0] : en[1]}`;
}

/** A nudge that says what is waiting on the client, with the portal link. */
export function nudgeMessage(
  lang: MsgLang,
  waiting: { ideas: number; scripts: number },
  url: string,
): string {
  const parts = [
    waiting.ideas > 0 && count(lang, waiting.ideas, ["idea", "ideas"], ["idée", "idées"]),
    waiting.scripts > 0 &&
      count(lang, waiting.scripts, ["script", "scripts"], ["script", "scripts"]),
  ].filter((p): p is string => Boolean(p));
  const total = waiting.ideas + waiting.scripts;
  if (parts.length === 0)
    return lang === "fr"
      ? `Bonjour ! Il y a du nouveau sur votre espace Gecko : ${url}`
      : `Hi! There's an update on your Gecko portal: ${url}`;
  const list = parts.join(lang === "fr" ? " et " : " and ");
  return lang === "fr"
    ? `Bonjour ! ${list} ${total > 1 ? "vous attendent" : "vous attend"} sur votre espace Gecko : ${url}\nValidez ou dites-nous quoi changer, directement là-bas.`
    : `Hi! ${list} ${total > 1 ? "are" : "is"} waiting for you on your Gecko portal: ${url}\nApprove or tell us what to change, right there.`;
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
