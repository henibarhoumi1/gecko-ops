// "New since your last visit": what Gecko did since the client last opened their portal.

import { t } from "@/lib/i18n";

export interface News {
  since: string | null;
  ideas: number;
  scripts: number;
  cuts: number;
  options: number;
  replies: number;
  delivered: number;
  invoices: number;
}

export interface NewsLine {
  n: number;
  label: string;
  /** Where to look; replies are spread across tabs, so they have none. */
  to: string | null;
}

function plural(n: number, en: [string, string], fr: [string, string]): string {
  return `${n} ${n === 1 ? t(en[0], fr[0]) : t(en[1], fr[1])}`;
}

/** One short line per kind of news, only the kinds that have something, most useful first. */
export function newsLines(news: News): NewsLine[] {
  const lines: (NewsLine | false)[] = [
    news.cuts > 0 && {
      n: news.cuts,
      label: plural(news.cuts, ["new video to watch", "new videos to watch"], ["nouvelle vidéo à regarder", "nouvelles vidéos à regarder"]),
      to: "/review",
    },
    news.scripts > 0 && {
      n: news.scripts,
      label: plural(news.scripts, ["new script to read", "new scripts to read"], ["nouveau script à lire", "nouveaux scripts à lire"]),
      to: "/scripts",
    },
    news.ideas > 0 && {
      n: news.ideas,
      label: plural(news.ideas, ["new idea", "new ideas"], ["nouvelle idée", "nouvelles idées"]),
      to: "/concepts",
    },
    news.options > 0 && {
      n: news.options,
      label: plural(news.options, ["shoot choice to make", "shoot choices to make"], ["choix de tournage à faire", "choix de tournage à faire"]),
      to: "/talent",
    },
    news.delivered > 0 && {
      n: news.delivered,
      label: plural(news.delivered, ["final video delivered", "final videos delivered"], ["vidéo finale livrée", "vidéos finales livrées"]),
      to: "/delivery",
    },
    news.replies > 0 && {
      n: news.replies,
      label: plural(news.replies, ["reply from Gecko", "replies from Gecko"], ["réponse de Gecko", "réponses de Gecko"]),
      to: null,
    },
    news.invoices > 0 && {
      n: news.invoices,
      label: plural(news.invoices, ["new invoice", "new invoices"], ["nouvelle facture", "nouvelles factures"]),
      to: "/money",
    },
  ];
  return lines.filter((l): l is NewsLine => Boolean(l));
}
