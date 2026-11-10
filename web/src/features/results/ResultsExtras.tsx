import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { useBrand } from "@/features/scripts/BrandDrawer";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { isCinematic, type Template } from "@/lib/wording";
import { hooksToReuse, provenHooks } from "./hooks";
import { mergeMetrics, readExport, taggedLink, type ImportResult } from "./importer";
import {
  FIELDS,
  type Checkpoint,
  type MetricKey,
  type Metrics,
  type Post,
  type ResultsPage,
} from "./model";
import { useResultActions, useResults, type ResultsTarget } from "./resultsApi";

const pct = (n: number) => `${Math.round(n * 1000) / 10} %`;

function metricLabel(key: MetricKey): string {
  for (const list of Object.values(FIELDS)) {
    const f = list.find((x) => x.key === key);
    if (f) return t(f.label[0], f.label[1]);
  }
  return key;
}

const MONEY: MetricKey[] = ["spend", "revenue"];

/**
 * Import numbers from an export (Ads Manager, Instagram, TikTok, Shopify or WooCommerce orders):
 * drop or paste the CSV, check which post each row goes to, save. Nothing is saved before that.
 */
export function ImportNumbers({
  target,
  page,
  onClose,
}: {
  target: ResultsTarget;
  page: ResultsPage;
  onClose: () => void;
}) {
  const { saveNumbers } = useResultActions(target);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [picks, setPicks] = useState<(string | null)[]>([]);
  const [day, setDay] = useState<Checkpoint>(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(0);

  function read(text: string) {
    setSaved(0);
    setError("");
    const out = readExport(text, page.posts);
    if (out.kind === "unknown")
      setError(
        t(
          "This doesn't look like an export we know. Export as CSV from Ads Manager, Instagram, TikTok Studio, Shopify or WooCommerce.",
          "Ce fichier ne ressemble pas à un export connu. Exportez en CSV depuis le Gestionnaire de publicités, Instagram, TikTok Studio, Shopify ou WooCommerce.",
        ),
      );
    setResult(out);
    setPicks(out.rows.map((r) => r.postId));
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000)
      return setError(t("That file is over 5 MB.", "Ce fichier dépasse 5 Mo."));
    read(await file.text());
  }

  async function save() {
    if (!result) return;
    // Rows that go to the same post add up.
    const per = new Map<string, Metrics>();
    result.rows.forEach((row, i) => {
      const postId = picks[i];
      if (!postId) return;
      const sum = { ...(per.get(postId) ?? {}) };
      for (const [k, v] of Object.entries(row.metrics) as [MetricKey, number][]) {
        if (MONEY.includes(k) && !page.seesMoney) continue;
        sum[k] = k === "avgWatch" || k === "completion" ? v : (sum[k] ?? 0) + v;
      }
      if (sum.completion != null) sum.completion = Math.min(100, sum.completion);
      per.set(postId, sum);
    });
    setBusy(true);
    setError("");
    let n = 0;
    try {
      for (const [postId, metrics] of per) {
        const post = page.posts.find((p) => p.id === postId)!;
        const before = post.numbers.find((x) => x.day === day);
        await saveNumbers.mutateAsync({
          postId,
          day,
          metrics: mergeMetrics(before?.metrics ?? {}, metrics),
          shots: before?.shots ?? [],
          note: before?.note ?? "",
        });
        n++;
      }
      setSaved(n);
      setResult(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const ready = picks.filter(Boolean).length;
  return (
    <div className="import-panel">
      <div className="group-head">
        <h3>{t("Import numbers from an export", "Importer les chiffres d'un export")}</h3>
        <Button variant="link" onClick={onClose}>
          {t("Close", "Fermer")}
        </Button>
      </div>
      <p className="small">
        {t(
          "Ads Manager, Instagram or Meta Business Suite, TikTok Studio: export the CSV and drop it here. Shopify or WooCommerce orders count the sales that came through a post's tagged link.",
          "Gestionnaire de publicités, Instagram ou Meta Business Suite, TikTok Studio : exportez le CSV et déposez-le ici. Les commandes Shopify ou WooCommerce comptent les ventes venues du lien tagué d'une vidéo.",
        )}
      </p>
      <div className="import-inputs">
        <label className="btn btn-secondary">
          {t("Choose a CSV file", "Choisir un fichier CSV")}
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            hidden
            onChange={(e) => void onFile(e)}
          />
        </label>
        <label>
          <span className="small">{t("Checkpoint", "Relevé")}</span>{" "}
          <select value={day} onChange={(e) => setDay(Number(e.target.value) as Checkpoint)}>
            <option value={7}>{t("7 days", "7 jours")}</option>
            <option value={30}>{t("30 days", "30 jours")}</option>
          </select>
        </label>
      </div>
      <textarea
        className="import-paste"
        rows={3}
        placeholder={t("…or paste the CSV here", "…ou collez le CSV ici")}
        onBlur={(e) => e.target.value.trim() && read(e.target.value)}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {saved > 0 && (
        <Notice>
          {t(
            `Saved the ${day}-day numbers of ${saved} ${saved === 1 ? "video" : "videos"}.`,
            `Chiffres à ${day} jours enregistrés pour ${saved} vidéo${saved === 1 ? "" : "s"}.`,
          )}
        </Notice>
      )}
      {result && result.kind !== "unknown" && (
        <>
          {result.orders && (
            <p className="small">
              {t(
                `${result.orders.read} orders read, ${result.orders.read - result.orders.untagged} came through a Gecko link.`,
                `${result.orders.read} commandes lues, ${result.orders.read - result.orders.untagged} venues d'un lien Gecko.`,
              )}
            </p>
          )}
          {result.rows.length === 0 ? (
            <p className="muted">
              {t("Nothing to import in this file.", "Rien à importer dans ce fichier.")}
            </p>
          ) : (
            <ul className="import-rows">
              {result.rows.map((row, i) => (
                <li key={`${row.label}-${i}`} className={picks[i] ? "" : "skip"}>
                  <div className="import-row-head">
                    <strong dir="auto">{row.label}</strong>
                    {row.by && picks[i] === row.postId && (
                      <span className="tag">
                        {row.by === "link"
                          ? t("same link", "même lien")
                          : row.by === "tag"
                            ? t("Gecko tag", "tag Gecko")
                            : t("similar title", "titre proche")}
                      </span>
                    )}
                  </div>
                  <select
                    aria-label={t("Which video", "Quelle vidéo")}
                    value={picks[i] ?? ""}
                    onChange={(e) =>
                      setPicks((list) => list.map((x, n) => (n === i ? e.target.value || null : x)))
                    }
                  >
                    <option value="">{t("Skip this row", "Ignorer cette ligne")}</option>
                    {page.posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <p className="small muted">
                    {(Object.entries(row.metrics) as [MetricKey, number][])
                      .filter(([k]) => page.seesMoney || !MONEY.includes(k))
                      .map(([k, v]) => `${metricLabel(k)} ${v.toLocaleString()}`)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="actions">
            <Button onClick={() => void save()} disabled={busy || ready === 0}>
              {busy
                ? t("Saving…", "Enregistrement…")
                : t(`Save ${ready} at ${day} days`, `Enregistrer ${ready} à ${day} jours`)}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** The hooks that worked for this client, as words, for the script editor's hook library. */
export function useProvenHooks(target: ResultsTarget): string[] {
  const results = useResults(target, Boolean(target.workspaceId && target.clientId));
  if (!results.data) return [];
  return hooksToReuse(provenHooks(results.data, isCinematic() ? "cinematic" : "performance")).map(
    (h) => h.text,
  );
}

/** The openings that held people best for this client, so the next scripts start from them. */
export function HooksThatWorked({
  page,
  template,
  base,
}: {
  page: ResultsPage;
  template: Template;
  base: string;
}) {
  const list = hooksToReuse(provenHooks(page, template));
  if (list.length === 0) return null;
  return (
    <div className="group proven">
      <h2>{t("Hooks that worked", "Les accroches qui ont marché")}</h2>
      <p className="small muted">
        {template === "cinematic"
          ? t(
              "Scored on how many watched to the end.",
              "Selon la part qui a regardé jusqu'au bout.",
            )
          : t(
              "Scored on 3-second views ÷ impressions. They show first in the hook library when writing.",
              "Selon vues de 3 s ÷ impressions. Elles s'affichent en premier dans la bibliothèque d'accroches.",
            )}
      </p>
      <ol className="proven-list">
        {list.map((h) => (
          <li key={h.text}>
            <span className="proven-score">{pct(h.score)}</span>
            <span dir="auto">“{h.text}”</span>
            <Link className="small" to={`${base}/${h.postId}`}>
              {h.postTitle}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** On a post: the script and hook it opened with, and the tagged link to share. */
export function PostSource({
  target,
  page,
  post,
  canEdit,
}: {
  target: ResultsTarget;
  page: ResultsPage;
  post: Post;
  canEdit: boolean;
}) {
  const { setPostScript } = useResultActions(target);
  const { sheet } = useBrand(target.workspaceId, target.clientId);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const script = page.scripts.find((s) => s.id === post.scriptId);
  const link = taggedLink(sheet.site, post);

  function set(scriptId: string | null, hook: number | null) {
    setError("");
    setPostScript
      .mutateAsync({ postId: post.id, scriptId, hook })
      .catch((e: unknown) => setError(friendlyError(e)));
  }

  return (
    <div className="post-source">
      <div className="post-source-row">
        <label>
          <span className="small">{t("Came from the script", "Vient du script")}</span>
          <select
            value={post.scriptId ?? ""}
            disabled={!canEdit}
            onChange={(e) => set(e.target.value || null, null)}
          >
            <option value="">{t("Not said", "Non précisé")}</option>
            {page.scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        {script && script.hooks.length > 0 && (
          <label>
            <span className="small">{t("Opened with", "Accroche utilisée")}</span>
            <select
              value={post.hookIndex ?? script.hook ?? 0}
              disabled={!canEdit}
              onChange={(e) => set(script.id, Number(e.target.value))}
            >
              {script.hooks.map((h, i) => (
                <option key={i} value={i}>
                  {i + 1}. {h.length > 60 ? `${h.slice(0, 60)}…` : h}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {link && (
        <p className="small tagged-link">
          {t("Tagged link: ", "Lien tagué : ")}
          <code>{link}</code>{" "}
          <Button
            variant="link"
            onClick={() =>
              void navigator.clipboard?.writeText(link).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              })
            }
          >
            {copied ? t("Copied", "Copié") : t("Copy", "Copier")}
          </Button>
          <span className="muted">
            {" "}
            ·{" "}
            {t(
              "use it in the bio, story or ad so orders count for this video.",
              "à mettre en bio, en story ou dans la pub pour que les commandes comptent pour cette vidéo.",
            )}
          </span>
        </p>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
