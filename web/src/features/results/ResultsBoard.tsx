// The top of a brand's results: the period's totals, the month-by-month line, the best videos with the hook that
// opened them, and which kinds of video and which channels did best. Team and client see the same board; money
// only for those who see money.
import { useState } from "react";
import { Link } from "react-router-dom";
import { STYLE_LABEL, type ScriptStyle } from "@/features/scripts/model";
import { locale, t } from "@/lib/i18n";
import type { Template } from "@/lib/wording";
import {
  byMonth,
  inPeriod,
  leaders,
  splitBy,
  styleOf,
  totals,
  type Period,
  type Ranked,
} from "./board";
import { monthName, platformName, todayIso, type Platform, type ResultsPage } from "./model";

const num = (v: number | null, digits = 0) =>
  v == null ? "–" : v.toLocaleString(locale(), { maximumFractionDigits: digits });
const compact = (v: number | null) =>
  v == null
    ? "–"
    : v >= 10_000
      ? v.toLocaleString(locale(), { notation: "compact", maximumFractionDigits: 1 })
      : num(v);
const pct = (v: number | null) => (v == null ? "–" : `${num(v * 100, 1)} %`);
const dt = (v: number | null) => (v == null ? "–" : `${num(v, 2)} DT`);

const periods = (): [Period, string][] => [
  ["30", t("30 days", "30 jours")],
  ["90", t("90 days", "90 jours")],
  ["365", t("12 months", "12 mois")],
  ["all", t("All", "Tout")],
];

interface Tile {
  label: string;
  value: string;
  sub?: string;
}

export function ResultsBoard({
  page,
  template,
  base,
}: {
  page: ResultsPage;
  template: Template;
  base: string;
}) {
  const [period, setPeriod] = useState<Period>("90");
  const today = todayIso();
  const posts = inPeriod(page.posts, period, today);
  const tt = totals(posts);
  if (page.posts.length === 0) return null;
  const money = page.seesMoney;

  const tiles: Tile[] =
    template === "cinematic"
      ? [
          {
            label: t("Views", "Vues"),
            value: compact(tt.views),
            sub: t(
              `${tt.read} of ${tt.posts} films read`,
              `${tt.read} films sur ${tt.posts} relevés`,
            ),
          },
          { label: t("Reach", "Couverture"), value: compact(tt.reach) },
          {
            label: t("Watched to the end", "Vu jusqu'au bout"),
            value: pct(tt.completion),
            sub: t("weighted by views", "pondéré par les vues"),
          },
          {
            label: t("Saves + shares per 1,000 views", "Enregistr. + partages / 1 000 vues"),
            value: num(tt.keepsPer1000, 1),
          },
          { label: t("New followers", "Nouveaux abonnés"), value: compact(tt.follows) },
        ]
      : [
          ...(money
            ? [
                {
                  label: t("Spent", "Dépensé"),
                  value: dt(tt.spend),
                  sub: t(
                    `${tt.read} of ${tt.posts} reels read`,
                    `${tt.read} vidéos sur ${tt.posts} relevées`,
                  ),
                },
                { label: t("Cost per purchase", "Coût par achat"), value: dt(tt.costPerPurchase) },
                {
                  label: "ROAS",
                  value: tt.roas == null ? "–" : `${num(tt.roas, 2)}×`,
                  ...(tt.revenue == null
                    ? {}
                    : { sub: `${dt(tt.revenue)} ${t("in sales", "de ventes")}` }),
                },
              ]
            : []),
          {
            label: t("Purchases", "Achats"),
            value: num(tt.purchases),
            ...(money
              ? {}
              : {
                  sub: t(
                    `${tt.read} of ${tt.posts} reels read`,
                    `${tt.read} vidéos sur ${tt.posts} relevées`,
                  ),
                }),
          },
          {
            label: t("Hook rate", "Taux d'accroche"),
            value: pct(tt.hookRate),
            sub: `${compact(tt.views3s)} ${t("3-s views", "vues de 3 s")}`,
          },
          {
            label: t("Click-through", "Taux de clic"),
            value: pct(tt.ctr),
            sub: `${compact(tt.clicks)} ${t("clicks", "clics")}`,
          },
          ...(money
            ? [
                {
                  label: "CPM",
                  value: dt(tt.cpm),
                  sub: t("per 1,000 impressions", "pour 1 000 impressions"),
                },
              ]
            : []),
        ];

  const months = byMonth(page.posts, template, 6, today);
  const top = leaders(posts, page, template, money);
  const kinds = splitBy(posts, styleOf(page), template);
  const channels = splitBy(posts, (p) => `${p.paid ? "paid" : "organic"}:${p.platform}`, template);
  const rateLabel =
    template === "cinematic" ? t("To the end", "Jusqu'au bout") : t("Hook rate", "Accroche");
  const secondLabel =
    template === "cinematic"
      ? t("Views", "Vues")
      : money
        ? t("Cost / purchase", "Coût / achat")
        : null;

  return (
    <section className="rb" aria-label={t("Results board", "Tableau des résultats")}>
      <div className="rb-head">
        <h2>{t("The numbers", "Les chiffres")}</h2>
        <div className="seg-row" role="group" aria-label={t("Period", "Période")}>
          {periods().map(([k, label]) => (
            <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tt.read === 0 ? (
        <p className="rb-none">
          {t(
            "No numbers in for this period yet. They appear here once the 7-day reads are typed in.",
            "Pas encore de chiffres sur cette période. Ils apparaissent ici dès que les relevés à 7 jours sont saisis.",
          )}
        </p>
      ) : (
        <div className="rb-tiles">
          {tiles.map((x) => (
            <div key={x.label} className="rb-tile">
              <span className="rb-label">{x.label}</span>
              <strong>{x.value}</strong>
              {x.sub && <span className="rb-sub">{x.sub}</span>}
            </div>
          ))}
        </div>
      )}

      <MonthBars
        months={months}
        label={
          template === "cinematic"
            ? t("Views by month they went live", "Vues par mois de mise en ligne")
            : t("Purchases by month they went live", "Achats par mois de mise en ligne")
        }
      />

      {top.length > 0 && (
        <div className="rb-block">
          <h3>{t("Best videos", "Meilleures vidéos")}</h3>
          <ol className="rb-top">
            {top.map((r, i) => (
              <li key={r.post.id}>
                <span className="rb-rank">{i + 1}</span>
                <Link to={`${base}/${r.post.id}`} className="rb-top-main">
                  <strong dir="auto">{r.post.title}</strong>
                  {r.hook && <span className="rb-hook">&ldquo;{r.hook}&rdquo;</span>}
                  <span className="rb-sub">
                    {platformName(r.post.platform)} ·{" "}
                    {r.post.paid ? t("paid", "sponsorisée") : t("organic", "organique")}
                    {r.style ? ` · ${STYLE_LABEL[r.style as ScriptStyle] ?? r.style}` : ""}
                  </span>
                </Link>
                <span className="rb-score">
                  <strong>{scoreText(r)}</strong>
                  <span className="rb-sub">{scoreLabel(r)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(kinds.length > 1 || channels.length > 1) && (
        <div className="rb-splits">
          {kinds.length > 1 && (
            <SplitTable
              title={t("By kind of video", "Par type de vidéo")}
              rows={kinds.map((k) => ({ ...k, name: STYLE_LABEL[k.key as ScriptStyle] ?? k.key }))}
              rateLabel={rateLabel}
              secondLabel={secondLabel}
              template={template}
            />
          )}
          {channels.length > 1 && (
            <SplitTable
              title={t("By channel", "Par canal")}
              rows={channels.map((c) => {
                const [kind, platform] = c.key.split(":") as [string, Platform];
                return {
                  ...c,
                  name: `${platformName(platform)}, ${kind === "paid" ? t("paid", "sponsorisé") : t("organic", "organique")}`,
                };
              })}
              rateLabel={rateLabel}
              secondLabel={secondLabel}
              template={template}
            />
          )}
        </div>
      )}
    </section>
  );
}

function scoreText(r: Ranked) {
  return r.as === "money" ? dt(r.score) : r.as === "pct" ? pct(r.score) : compact(r.score);
}
function scoreLabel(r: Ranked) {
  return r.as === "money"
    ? t("per purchase", "par achat")
    : r.as === "pct"
      ? t("hook rate", "accroche")
      : r.post.numbers.some((n) => n.metrics.views != null)
        ? t("views", "vues")
        : t("purchases", "achats");
}

function SplitTable({
  title,
  rows,
  rateLabel,
  secondLabel,
  template,
}: {
  title: string;
  rows: { key: string; name: string; posts: number; rate: number | null; second: number | null }[];
  rateLabel: string;
  secondLabel: string | null;
  template: Template;
}) {
  const best = Math.max(...rows.map((r) => r.rate ?? 0)) || 1;
  return (
    <div className="rb-block">
      <h3>{title}</h3>
      <table className="rb-table">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">{t("Videos", "Vidéos")}</th>
            <th scope="col">{rateLabel}</th>
            {secondLabel && <th scope="col">{secondLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.name}</th>
              <td>{r.posts}</td>
              <td>
                <span className="rb-meter" aria-hidden="true">
                  <span style={{ width: `${Math.round(((r.rate ?? 0) / best) * 100)}%` }} />
                </span>
                {pct(r.rate)}
              </td>
              {secondLabel && (
                <td>{template === "cinematic" ? compact(r.second) : dt(r.second)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthBars({
  months,
  label,
}: {
  months: { month: string; value: number; posts: number }[];
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => m.value));
  if (!max) return null;
  return (
    <div className="rb-block">
      <h3>{label}</h3>
      <div
        className="rb-bars"
        role="img"
        aria-label={months.map((m) => `${monthName(m.month)}: ${num(m.value)}`).join(", ")}
      >
        {months.map((m, i) => (
          <div
            key={m.month}
            className={`rb-bar${hover === i ? " is-on" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="rb-bar-val">{m.value ? compact(m.value) : ""}</span>
            <span
              className="rb-bar-fill"
              style={{ height: `${Math.max(m.value ? 3 : 0, (m.value / max) * 100)}%` }}
            />
            <span className="rb-bar-month">{monthName(m.month).split(" ")[0]?.slice(0, 3)}</span>
            {hover === i && (
              <span className="rb-tip" role="tooltip">
                <b>{monthName(m.month)}</b>
                {num(m.value)} · {m.posts}{" "}
                {t(m.posts === 1 ? "video" : "videos", m.posts === 1 ? "vidéo" : "vidéos")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
