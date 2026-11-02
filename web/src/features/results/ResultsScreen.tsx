import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import { shortDate } from "@/features/concepts/model";
import { Photos, PhotoPicker } from "@/features/production/ProductionParts";
import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { tw, words, type Template } from "@/lib/wording";
import {
  CHECKPOINTS,
  checkState,
  dueOn,
  FIELDS,
  formatHeadline,
  headlines,
  monthName,
  readMonth,
  PLATFORMS,
  platformName,
  postsIn,
  todayIso,
  waiting,
  type Checkpoint,
  type Metrics,
  type MonthlyRead,
  type Post,
  type ResultsPage,
} from "./model";
import { RESULTS_BUCKET, useResultActions, useResults, type ResultsTarget } from "./resultsApi";

const day = (iso: string | null) => shortDate(iso).replace(/\.$/, "");

/** The best numbers there are for a post: the 30-day read once it's in, otherwise the 7-day one. */
function bestNumbers(post: Post) {
  const done = post.numbers.filter((n) => Object.keys(n.metrics).length > 0);
  return done.find((n) => n.day === 30) ?? done.find((n) => n.day === 7) ?? null;
}

/** Results for one client: each video at 7 and 30 days, and Gecko's monthly read. Team and client share it. */
export function ResultsScreen({
  target,
  base,
  template,
}: {
  target: ResultsTarget;
  /** Where the screen lives: "/results" in the portal, "/clients/<id>/results" for the team. */
  base: string;
  template: Template;
}) {
  const { postId } = useParams();
  const results = useResults(target);
  if (results.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (results.isError) return <Notice tone="error">{friendlyError(results.error)}</Notice>;
  const page = results.data;

  if (postId) {
    const post = page.posts.find((p) => p.id === postId);
    if (!post)
      return (
        <Notice>
          {t("This video isn't here any more.", "Cette vidéo n'est plus là.")}{" "}
          <Link to={base}>{words.results()}</Link>
        </Notice>
      );
    return <PostScreen target={target} base={base} template={template} page={page} post={post} />;
  }
  return <ResultsList target={target} base={base} template={template} page={page} />;
}

function ResultsList({
  target,
  base,
  template,
  page,
}: {
  target: ResultsTarget;
  base: string;
  template: Template;
  page: ResultsPage;
}) {
  const [adding, setAdding] = useState(false);
  const today = todayIso();
  const open = waiting(page.posts, today);
  return (
    <section className="tab-body results">
      <p className="lede">
        {page.team
          ? "Each video, read 7 and 30 days after it went live, so they compare fairly. The client drops screenshots; type the numbers in. Once a month, write the read."
          : tw(
              [
                "What each reel did, read 7 and 30 days after it went live. Drop a screenshot of your Insights or Ads Manager and Gecko types the numbers in.",
                "Ce que chaque vidéo a donné, 7 et 30 jours après sa mise en ligne. Déposez une capture de vos statistiques ou du Gestionnaire de publicités, Gecko saisit les chiffres.",
              ],
              [
                "How each film travelled, read 7 and 30 days after it went live. Drop a screenshot of your Insights and Gecko types the numbers in.",
                "Le parcours de chaque film, 7 et 30 jours après sa mise en ligne. Déposez une capture de vos statistiques, Gecko saisit les chiffres.",
              ],
            )}
      </p>

      {(page.team ? open.shots + open.due : open.due) > 0 && (
        <p className="results-waiting">
          {page.team
            ? [
                open.shots > 0 &&
                  `${open.shots} ${open.shots === 1 ? "screenshot" : "screenshots"} to type in`,
                open.due > 0 &&
                  `${open.due} ${open.due === 1 ? "checkpoint is" : "checkpoints are"} due with nothing in yet`,
              ]
                .filter(Boolean)
                .join(", ") + "."
            : open.due === 1
              ? t(
                  "One checkpoint is due. Open the video and add a screenshot.",
                  "Un relevé est dû. Ouvrez la vidéo et ajoutez une capture.",
                )
              : t(
                  `${open.due} checkpoints are due. Open each video and add a screenshot.`,
                  `${open.due} relevés sont dus. Ouvrez chaque vidéo et ajoutez une capture.`,
                )}
        </p>
      )}

      <MonthlyReads target={target} template={template} page={page} />

      <div className="group">
        <div className="group-head">
          <h2>
            {tw(["Reels online", "Vidéos en ligne"], ["Films online", "Films en ligne"])}{" "}
            <span className="count">{page.posts.length}</span>
          </h2>
          {page.canAdd && !adding && (
            <Button variant="secondary" onClick={() => setAdding(true)}>
              {t("+ Add one that went live", "+ Ajouter une mise en ligne")}
            </Button>
          )}
        </div>
        {adding && (
          <PostForm
            target={target}
            template={template}
            page={page}
            post={null}
            onDone={() => setAdding(false)}
          />
        )}
        {page.posts.length === 0 && !adding ? (
          <p className="muted">
            {page.team
              ? "Nothing logged yet. Add each video the day it goes live."
              : tw(
                  [
                    "Nothing here yet. Add each reel the day it goes live, with its link, and we'll know when to read it.",
                    "Rien pour l'instant. Ajoutez chaque vidéo le jour de sa mise en ligne, avec son lien : on saura quand la lire.",
                  ],
                  [
                    "Nothing here yet. Add each film the day it goes live, with its link, and we'll know when to read it.",
                    "Rien pour l'instant. Ajoutez chaque film le jour de sa mise en ligne, avec son lien : on saura quand le lire.",
                  ],
                )}
          </p>
        ) : (
          <ul className="post-list">
            {page.posts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                to={`${base}/${post.id}`}
                template={template}
                money={page.seesMoney}
                team={page.team}
                today={today}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PostRow({
  post,
  to,
  template,
  money,
  team,
  today,
}: {
  post: Post;
  to: string;
  template: Template;
  money: boolean;
  team: boolean;
  today: string;
}) {
  return (
    <li>
      <Link to={to} className="post-row">
        <span className="post-row-head">
          <strong dir="auto">{post.title}</strong>
          <span className="small muted">
            {platformName(post.platform)} ·{" "}
            {post.paid ? t("paid", "sponsorisée") : t("organic", "organique")} ·{" "}
            {t("live", "en ligne le")} {day(post.liveOn)}
          </span>
        </span>
        {CHECKPOINTS.map((d) => (
          <CheckCell
            key={d}
            post={post}
            day={d}
            template={template}
            money={money}
            team={team}
            today={today}
          />
        ))}
      </Link>
    </li>
  );
}

function CheckCell({
  post,
  day: d,
  template,
  money,
  team,
  today,
}: {
  post: Post;
  day: Checkpoint;
  template: Template;
  money: boolean;
  team: boolean;
  today: string;
}) {
  const state = checkState(post, d, today);
  const n = post.numbers.find((x) => x.day === d);
  return (
    <span className={`check-cell is-${state}`}>
      <span className="check-day">{t(`${d} days`, `${d} jours`)}</span>
      {state === "done" && n ? (
        <span className="check-figures">
          {headlines(template, n.metrics, money)
            .filter((h) => h.value != null)
            .slice(0, 3)
            .map((h) => (
              <span key={h.key}>
                <b>{formatHeadline(h)}</b> {h.label.toLowerCase()}
              </span>
            ))}
        </span>
      ) : state === "shots" ? (
        <span className="small">
          {team
            ? "Screenshot in. Type the numbers."
            : t("Screenshot in. Gecko is on it.", "Capture reçue. Gecko s'en occupe.")}
        </span>
      ) : state === "due" ? (
        <span className="small">
          {dueOn(post.liveOn, d) === today
            ? t("Due today", "À relever aujourd'hui")
            : t(
                `Due since ${day(dueOn(post.liveOn, d))}`,
                `À relever depuis le ${day(dueOn(post.liveOn, d))}`,
              )}
        </span>
      ) : (
        <span className="small muted">
          {t(`On ${day(dueOn(post.liveOn, d))}`, `Le ${day(dueOn(post.liveOn, d))}`)}
        </span>
      )}
    </span>
  );
}

function PostForm({
  target,
  template,
  page,
  post,
  onDone,
}: {
  target: ResultsTarget;
  template: Template;
  page: ResultsPage;
  post: Post | null;
  onDone: () => void;
}) {
  const { savePost } = useResultActions(target);
  const [error, setError] = useState("");
  const [cutId, setCutId] = useState(post?.cutId ?? "");
  const [title, setTitle] = useState(post?.title ?? "");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const liveOn = String(f.get("liveOn") ?? "");
    const finalTitle = title.trim() || page.cuts.find((c) => c.id === cutId)?.title || "";
    if (!finalTitle)
      return setError(
        t("Give it a name, or pick the cut it is.", "Donnez-lui un nom, ou choisissez le montage."),
      );
    if (!liveOn)
      return setError(t("Add the day it went live.", "Indiquez le jour de mise en ligne."));
    setError("");
    try {
      await savePost.mutateAsync({
        id: post?.id ?? null,
        cutId: cutId || null,
        title: finalTitle,
        platform: String(f.get("platform")) as Post["platform"],
        paid: f.get("paid") === "paid",
        link: String(f.get("link") ?? "").trim(),
        liveOn,
        press: String(f.get("press") ?? ""),
      });
      onDone();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <form className="post-form card" onSubmit={onSubmit}>
      {page.cuts.length > 0 && (
        <Select
          label={t("Which cut", "Quel montage")}
          value={cutId}
          onChange={(e) => setCutId(e.target.value)}
          options={[
            ["", t("Not from a cut", "Hors montage")],
            ...page.cuts.map((c) => [c.id, c.title] as const),
          ]}
        />
      )}
      <Field
        label={t("Name", "Nom")}
        value={title}
        maxLength={160}
        placeholder={page.cuts.find((c) => c.id === cutId)?.title ?? ""}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="post-form-row">
        <Select
          label={t("Where", "Où")}
          name="platform"
          defaultValue={post?.platform ?? "instagram"}
          options={PLATFORMS.map(([k]) => [k, platformName(k)] as const)}
        />
        <Select
          label={t("How", "Comment")}
          name="paid"
          defaultValue={post?.paid ? "paid" : "organic"}
          options={[
            ["paid", t("Paid ad", "Publicité sponsorisée")],
            ["organic", t("Organic post", "Publication organique")],
          ]}
        />
        <Field
          label={t("Went live on", "Mise en ligne le")}
          name="liveOn"
          type="date"
          defaultValue={post?.liveOn ?? todayIso()}
          max={todayIso()}
        />
      </div>
      <Field
        label={t("Link to the post or ad", "Lien vers la publication ou la pub")}
        name="link"
        type="url"
        inputMode="url"
        placeholder="https://"
        defaultValue={post?.link ?? ""}
      />
      {template === "cinematic" && (
        <TextArea
          label={t(
            "Press and features (one link per line)",
            "Presse et reprises (un lien par ligne)",
          )}
          name="press"
          rows={2}
          defaultValue={post?.press ?? ""}
        />
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions start">
        <Button type="submit" disabled={savePost.isPending}>
          {post ? t("Save", "Enregistrer") : t("Add", "Ajouter")}
        </Button>
        <Button variant="link" onClick={onDone}>
          {t("Cancel", "Annuler")}
        </Button>
      </div>
    </form>
  );
}

function PostScreen({
  target,
  base,
  template,
  page,
  post,
}: {
  target: ResultsTarget;
  base: string;
  template: Template;
  page: ResultsPage;
  post: Post;
}) {
  const [editing, setEditing] = useState(false);
  const { removePost } = useResultActions(target);
  const mine = page.team || post.fromClient;
  const best = bestNumbers(post);
  const press = post.press
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  async function remove() {
    if (
      !window.confirm(
        t("Remove this video and its numbers?", "Retirer cette vidéo et ses chiffres ?"),
      )
    )
      return;
    await removePost.mutateAsync({ id: post.id, shots: post.numbers.flatMap((n) => n.shots) });
  }

  return (
    <section className="tab-body results">
      <p className="small">
        <Link to={base}>← {words.results()}</Link>
      </p>
      <h2 className="screen-title" dir="auto">
        {post.title}
      </h2>
      <p className="small muted">
        {platformName(post.platform)} ·{" "}
        {post.paid ? t("paid", "sponsorisée") : t("organic", "organique")} ·{" "}
        {t("live since", "en ligne depuis le")} {day(post.liveOn)}
        {post.link && (
          <>
            {" · "}
            <a href={post.link} target="_blank" rel="noreferrer noopener">
              {t("Open the post", "Voir la publication")}
            </a>
          </>
        )}
        {mine && page.canAdd && !editing && (
          <>
            {" · "}
            <Button variant="link" onClick={() => setEditing(true)}>
              {t("Edit", "Modifier")}
            </Button>
          </>
        )}
      </p>
      {editing && (
        <PostForm
          target={target}
          template={template}
          page={page}
          post={post}
          onDone={() => setEditing(false)}
        />
      )}
      {best && (
        <Figures template={template} metrics={best.metrics} money={page.seesMoney} day={best.day} />
      )}
      {press.length > 0 && (
        <div className="press">
          <h3>{t("Press and features", "Presse et reprises")}</h3>
          <ul>
            {press.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer noopener">
                  {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 70)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="checkpoints">
        {CHECKPOINTS.map((d) => (
          <CheckpointForm
            key={`${d}-${post.numbers.find((n) => n.day === d)?.updatedAt ?? ""}`}
            target={target}
            template={template}
            page={page}
            post={post}
            day={d}
          />
        ))}
      </div>
      {mine && page.canAdd && (
        <p className="small">
          <Button
            variant="link"
            className="danger"
            onClick={() => void remove()}
            disabled={removePost.isPending}
          >
            {t("Remove this video", "Retirer cette vidéo")}
          </Button>
        </p>
      )}
      {removePost.isError && <Notice tone="error">{friendlyError(removePost.error)}</Notice>}
    </section>
  );
}

/** The headline rates in a ruled row: what people judge a video by, not every number typed in. */
function Figures({
  template,
  metrics,
  money,
  day: d,
}: {
  template: Template;
  metrics: Metrics;
  money: boolean;
  day: Checkpoint;
}) {
  const rows = headlines(template, metrics, money);
  return (
    <div className="figures">
      <dl>
        {rows.map((h) => (
          <div key={h.key} className={h.value == null ? "empty" : ""}>
            <dt>{h.label}</dt>
            <dd>{formatHeadline(h)}</dd>
          </div>
        ))}
      </dl>
      <p className="small muted">{t(`At ${d} days.`, `À ${d} jours.`)}</p>
    </div>
  );
}

function CheckpointForm({
  target,
  template,
  page,
  post,
  day: d,
}: {
  target: ResultsTarget;
  template: Template;
  page: ResultsPage;
  post: Post;
  day: Checkpoint;
}) {
  const { saveNumbers } = useResultActions(target);
  const existing = post.numbers.find((n) => n.day === d);
  const [shots, setShots] = useState<string[]>(existing?.shots ?? []);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const fields = FIELDS[template].filter((f) => !f.money || page.seesMoney);
  // The client sends screenshots and Gecko types; the boxes open for a client who'd rather type them in.
  const showFields = page.team || typing || Object.keys(existing?.metrics ?? {}).length > 0;
  const due = dueOn(post.liveOn, d);
  const early = due > todayIso();

  async function save(next: { metrics?: Metrics; shots?: string[]; note?: string }) {
    setError("");
    setSaved(false);
    try {
      await saveNumbers.mutateAsync({
        postId: post.id,
        day: d,
        metrics: next.metrics ?? existing?.metrics ?? {},
        shots: next.shots ?? shots,
        note: next.note ?? existing?.note ?? "",
      });
      setSaved(true);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const metrics: Metrics = {};
    for (const field of FIELDS[template]) {
      const raw = String(f.get(field.key) ?? "")
        .replace(/\s/g, "")
        .replace(",", ".");
      if (raw === "") continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0)
        return setError(t(`Check "${field.label[0]}".`, `Vérifiez « ${field.label[1]} ».`));
      metrics[field.key] = n;
    }
    // Spend and sales the reader can't see stay as they were; the database keeps them.
    await save({ metrics, note: String(f.get("note") ?? "") });
  }

  return (
    <form className={`checkpoint card${early ? " is-early" : ""}`} onSubmit={onSubmit}>
      <div className="checkpoint-head">
        <h3>{t(`At ${d} days`, `À ${d} jours`)}</h3>
        <span className="small muted">
          {early ? t(`Readable on ${day(due)}`, `À relever le ${day(due)}`) : day(due)}
          {existing?.enteredBy && ` · ${t("typed in by", "saisi par")} ${existing.enteredBy}`}
        </span>
      </div>
      {page.canAdd ? (
        <PhotoPicker
          target={target}
          value={shots}
          max={4}
          bucket={RESULTS_BUCKET}
          folder={post.id}
          label={t("Screenshots", "Captures d'écran")}
          addLabel={t("+ Add a screenshot", "+ Ajouter une capture")}
          onChange={(paths) => {
            setShots(paths);
            void save({ shots: paths });
          }}
        />
      ) : (
        <Photos paths={shots} alt={t("Screenshot", "Capture")} bucket={RESULTS_BUCKET} />
      )}
      {showFields ? (
        <div className="metric-grid">
          {fields.map((field) => (
            <Field
              key={field.key}
              label={t(field.label[0], field.label[1]) + (field.unit ? ` (${field.unit})` : "")}
              name={field.key}
              inputMode="decimal"
              autoComplete="off"
              title={field.hint ? t(field.hint[0], field.hint[1]) : undefined}
              defaultValue={existing?.metrics[field.key]?.toString() ?? ""}
              disabled={!page.canAdd}
            />
          ))}
        </div>
      ) : (
        page.canAdd && (
          <p className="small muted">
            {t(
              "Gecko types the numbers in from your screenshot.",
              "Gecko saisit les chiffres à partir de votre capture.",
            )}{" "}
            <Button variant="link" onClick={() => setTyping(true)}>
              {t("Type them yourself", "Les saisir vous-même")}
            </Button>
          </p>
        )
      )}
      <TextArea
        label={t("Note", "Note")}
        name="note"
        rows={2}
        maxLength={1000}
        defaultValue={existing?.note ?? ""}
        placeholder={t(
          "Anything that explains the numbers: a budget change, a repost, a promo running.",
          "Ce qui explique les chiffres : un budget modifié, un repost, une promo en cours.",
        )}
        disabled={!page.canAdd}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {page.canAdd && (
        <div className="actions start">
          <Button type="submit" disabled={saveNumbers.isPending}>
            {showFields
              ? t("Save the numbers", "Enregistrer les chiffres")
              : t("Save the note", "Enregistrer la note")}
          </Button>
          {saved && <span className="small muted">{t("Saved.", "Enregistré.")}</span>}
        </div>
      )}
    </form>
  );
}

// ---------- monthly read ----------

function MonthlyReads({
  target,
  template,
  page,
}: {
  target: ResultsTarget;
  template: Template;
  page: ResultsPage;
}) {
  const [writing, setWriting] = useState<string | null>(null);
  const thisMonth = readMonth(todayIso());
  const [latest, ...older] = page.reads;
  const hasThisMonth = page.reads.some((r) => r.month.slice(0, 7) === thisMonth.slice(0, 7));

  if (!page.team && !latest) return null;
  return (
    <div className="group monthly">
      <div className="group-head">
        <h2>
          {page.team ? "Monthly read" : t("Gecko's monthly read", "Le bilan du mois par Gecko")}
        </h2>
        {page.team && !writing && !hasThisMonth && (
          <Button variant="secondary" onClick={() => setWriting(thisMonth)}>
            {`Write ${monthName(thisMonth)}`}
          </Button>
        )}
      </div>
      {writing && (
        <ReadForm
          target={target}
          page={page}
          read={page.reads.find((r) => r.month.slice(0, 7) === writing.slice(0, 7)) ?? null}
          month={writing}
          onDone={() => setWriting(null)}
        />
      )}
      {page.team && !latest && !writing && (
        <p className="muted">
          One page a month: the strongest and weakest video with their numbers, three things
          learned, and what to test next. The tests drop into Ideas as drafts when you publish.
        </p>
      )}
      {latest && writing?.slice(0, 7) !== latest.month.slice(0, 7) && (
        <ReadView
          read={latest}
          page={page}
          template={template}
          onEdit={latest.status === "draft" ? () => setWriting(latest.month) : undefined}
          target={target}
        />
      )}
      {older.length > 0 && (
        <details className="older-reads">
          <summary>{t("Earlier months", "Mois précédents")}</summary>
          {older.map((r) => (
            <ReadView key={r.id} read={r} page={page} template={template} target={target} />
          ))}
        </details>
      )}
    </div>
  );
}

function ReadView({
  read,
  page,
  template,
  target,
  onEdit,
}: {
  read: MonthlyRead;
  page: ResultsPage;
  template: Template;
  target: ResultsTarget;
  onEdit?: () => void;
}) {
  const { publishRead } = useResultActions(target);
  const [published, setPublished] = useState<number | null>(null);
  const best = page.posts.find((p) => p.id === read.bestPost);
  const worst = page.posts.find((p) => p.id === read.worstPost);

  async function publish() {
    if (
      !window.confirm(
        "Publish this read? The client sees it now, and each test becomes a draft idea. It can't be edited after.",
      )
    )
      return;
    setPublished(await publishRead.mutateAsync(read.id));
  }

  return (
    <article className={`read${read.status === "draft" ? " is-draft" : ""}`}>
      <header>
        <h3>{monthName(read.month)}</h3>
        {read.status === "draft" ? (
          <span className="tag">Draft, only Gecko sees it</span>
        ) : (
          page.team && <span className="small muted">Published {day(read.publishedAt)}</span>
        )}
      </header>
      <div className="read-pair">
        {[
          [best, read.bestWhy, t("Strongest", "Le plus fort"), "best"] as const,
          [worst, read.worstWhy, t("Weakest", "Le plus faible"), "worst"] as const,
        ].map(([post, why, label, kind]) =>
          post ? (
            <div key={kind} className={`read-pick ${kind}`}>
              <span className="read-label">{label}</span>
              <strong dir="auto">{post.title}</strong>
              {bestNumbers(post) && (
                <span className="small">
                  {headlines(template, bestNumbers(post)!.metrics, page.seesMoney)
                    .filter((h) => h.value != null)
                    .slice(0, 3)
                    .map((h) => `${formatHeadline(h)} ${h.label.toLowerCase()}`)
                    .join(" · ")}
                </span>
              )}
              {why && <p dir="auto">{why}</p>}
            </div>
          ) : null,
        )}
      </div>
      {read.learned.length > 0 && (
        <>
          <h4>{t("What we learned", "Ce qu'on a appris")}</h4>
          <ol className="read-lines">
            {read.learned.map((line) => (
              <li key={line} dir="auto">
                {line}
              </li>
            ))}
          </ol>
        </>
      )}
      {read.nextTests.length > 0 && (
        <>
          <h4>{t("What we test next month", "Ce qu'on teste le mois prochain")}</h4>
          <ul className="read-tests">
            {read.nextTests.map((line) => (
              <li key={line} dir="auto">
                {line}
              </li>
            ))}
          </ul>
          {read.status === "published" && !page.team && (
            <p className="small muted">
              {t(
                `Each test comes to you in ${words.ideas()} for approval.`,
                `Chaque test vous arrivera dans ${words.ideas()} pour validation.`,
              )}
            </p>
          )}
        </>
      )}
      {page.team && read.status === "draft" && (
        <div className="actions start">
          <Button onClick={() => void publish()} disabled={publishRead.isPending}>
            Publish to the client
          </Button>
          {onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      )}
      {published != null && (
        <p className="small">
          Published. {published} {published === 1 ? "test is" : "tests are"} now draft ideas.
        </p>
      )}
      {publishRead.isError && <Notice tone="error">{friendlyError(publishRead.error)}</Notice>}
    </article>
  );
}

function ReadForm({
  target,
  page,
  read,
  month,
  onDone,
}: {
  target: ResultsTarget;
  page: ResultsPage;
  read: MonthlyRead | null;
  month: string;
  onDone: () => void;
}) {
  const { saveRead, removeRead } = useResultActions(target);
  const [error, setError] = useState("");
  const inMonth = postsIn(page.posts, month);
  const choices = (inMonth.length ? inMonth : page.posts).map((p) => [p.id, p.title] as const);
  const options = [["", "None"] as const, ...choices];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const list = (name: string) =>
      f
        .getAll(name)
        .map((x) => String(x).trim())
        .filter(Boolean);
    const learned = list("learned");
    if (learned.length === 0) return setError("Write at least one thing we learned.");
    setError("");
    try {
      await saveRead.mutateAsync({
        month,
        best: String(f.get("best") ?? "") || null,
        bestWhy: String(f.get("bestWhy") ?? ""),
        worst: String(f.get("worst") ?? "") || null,
        worstWhy: String(f.get("worstWhy") ?? ""),
        learned,
        next: list("next"),
      });
      onDone();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function discard() {
    if (read && !window.confirm("Delete this draft?")) return;
    if (read) await removeRead.mutateAsync(read.id);
    onDone();
  }

  return (
    <form className="read-form card" onSubmit={onSubmit}>
      <h3>{monthName(month)}</h3>
      <div className="read-form-pair">
        <div>
          <Select
            label="Strongest video"
            name="best"
            defaultValue={read?.bestPost ?? ""}
            options={options}
          />
          <Field
            label="Why it worked"
            name="bestWhy"
            maxLength={400}
            defaultValue={read?.bestWhy ?? ""}
          />
        </div>
        <div>
          <Select
            label="Weakest video"
            name="worst"
            defaultValue={read?.worstPost ?? ""}
            options={options}
          />
          <Field
            label="Why it didn't"
            name="worstWhy"
            maxLength={400}
            defaultValue={read?.worstWhy ?? ""}
          />
        </div>
      </div>
      <fieldset>
        <legend>Three things we learned</legend>
        {[0, 1, 2].map((i) => (
          <Field
            key={i}
            label={`${i + 1}.`}
            name="learned"
            maxLength={300}
            defaultValue={read?.learned[i] ?? ""}
          />
        ))}
      </fieldset>
      <fieldset>
        <legend>What we test next month (each becomes a draft idea)</legend>
        {[0, 1, 2, 3, 4].map((i) => (
          <Field
            key={i}
            label={`${i + 1}.`}
            name="next"
            maxLength={160}
            defaultValue={read?.nextTests[i] ?? ""}
          />
        ))}
      </fieldset>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions start">
        <Button type="submit" disabled={saveRead.isPending}>
          Save the draft
        </Button>
        <Button variant="link" onClick={() => void discard()}>
          {read ? "Delete the draft" : "Cancel"}
        </Button>
      </div>
    </form>
  );
}
