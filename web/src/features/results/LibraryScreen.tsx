import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Notice } from "@/components/Notice";
import { Select } from "@/components/Select";
import { TextArea } from "@/components/TextArea";
import { useImageUrl } from "@/features/board/boardApi";
import { shortDate } from "@/features/concepts/model";
import { PhotoPicker } from "@/features/production/ProductionParts";
import { timecode } from "@/features/review/model";
import { friendlyError } from "@/lib/errors";
import { plural, t } from "@/lib/i18n";
import { tw } from "@/lib/wording";
import {
  BASE_TAGS,
  filterItems,
  parseTags,
  shootsInUse,
  tagName,
  tagsInUse,
  type ItemKind,
  type LibraryItem,
  type LibraryPage,
} from "./library";
import { LIBRARY_BUCKET, useLibrary, useLibraryActions, type ResultsTarget } from "./resultsApi";

/**
 * Every clip and still from every shoot, tagged. The team adds them with the Drive link; the client browses the
 * thumbnails, picks a few and asks Gecko to make something from them. The raw files never go to the client.
 */
export function LibraryScreen({ target }: { target: ResultsTarget }) {
  const library = useLibrary(target);
  const [tags, setTags] = useState<string[]>([]);
  const [shoot, setShoot] = useState("");
  const [kind, setKind] = useState<ItemKind | "">("");
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<LibraryItem | "new" | null>(null);

  if (library.isPending) return <p className="muted">{t("Loading…", "Chargement…")}</p>;
  if (library.isError) return <Notice tone="error">{friendlyError(library.error)}</Notice>;
  const page = library.data;
  const shown = filterItems(page.items, { tags, shoot, kind });
  const allTags = tagsInUse(page.items);
  const shoots = shootsInUse(page.items);
  const toggle = (list: string[], x: string) =>
    list.includes(x) ? list.filter((y) => y !== x) : [...list, x];

  return (
    <section className="tab-body library">
      <p className="lede">
        {page.team
          ? "Every clip and still from every shoot, tagged. Add the Drive link and a thumbnail; the client sees the thumbnail and tags, never the file, and can ask for something made from what they pick."
          : tw(
              [
                "Every clip and still from your shoots. Pick the ones you like and ask Gecko to make something from them: a new hook, a cutdown, a story.",
                "Tous les plans et photos de vos tournages. Choisissez ceux qui vous plaisent et demandez à Gecko d'en faire quelque chose : une nouvelle accroche, une version courte, une story.",
              ],
              [
                "Every shot and still from your shoots. Pick the ones you like and ask Gecko to make something from them.",
                "Tous les plans et photos de vos tournages. Choisissez ceux qui vous plaisent et demandez à Gecko d'en faire quelque chose.",
              ],
            )}
      </p>

      {page.team && editing === null && (
        <p>
          <Button variant="secondary" onClick={() => setEditing("new")}>
            + Add a clip or still
          </Button>
        </p>
      )}
      {page.team && editing !== null && (
        <ItemForm
          target={target}
          page={page}
          item={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      )}

      {page.items.length > 0 && (
        <div className="lib-filters">
          <div className="lib-kinds" role="group" aria-label={t("Type", "Type")}>
            {(
              [
                ["", t("All", "Tout")],
                ["clip", t("Clips", "Plans")],
                ["still", t("Stills", "Photos")],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className="chip"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {label}
              </button>
            ))}
          </div>
          {allTags.length > 0 && (
            <div className="lib-tags" role="group" aria-label={t("Tags", "Tags")}>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip"
                  aria-pressed={tags.includes(tag)}
                  onClick={() => setTags(toggle(tags, tag))}
                >
                  {tagName(tag)}
                </button>
              ))}
            </div>
          )}
          {shoots.length > 1 && (
            <Select
              label={t("Shoot", "Tournage")}
              value={shoot}
              onChange={(e) => setShoot(e.target.value)}
              options={[
                ["", t("Every shoot", "Tous les tournages")],
                ...shoots.map((s) => [s, s] as const),
              ]}
            />
          )}
        </div>
      )}

      {page.items.length === 0 ? (
        <p className="muted">
          {page.team
            ? "Nothing yet. After each shoot, add the selects with a thumbnail and tags."
            : t(
                "Your clips and stills show up here after each shoot.",
                "Vos plans et photos s'affichent ici après chaque tournage.",
              )}
        </p>
      ) : shown.length === 0 ? (
        <p className="muted">
          {t("Nothing matches all of those.", "Rien ne correspond à tout ça.")}
        </p>
      ) : (
        <ul className="lib-grid">
          {shown.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              team={page.team}
              picked={picked.includes(item.id)}
              onPick={() => setPicked(toggle(picked, item.id))}
              onEdit={() => setEditing(item)}
            />
          ))}
        </ul>
      )}

      {!page.team && picked.length > 0 && (
        <AskBar target={target} count={picked.length} ids={picked} onSent={() => setPicked([])} />
      )}
    </section>
  );
}

function Thumb({ item }: { item: LibraryItem }) {
  const url = useImageUrl(item.thumb ?? undefined, LIBRARY_BUCKET);
  return (
    <span className={`lib-thumb kind-${item.kind}`}>
      {url.data ? <img src={url.data} alt="" loading="lazy" /> : <span aria-hidden="true" />}
      {item.kind === "clip" && item.seconds != null && (
        <span className="lib-length">{timecode(Number(item.seconds))}</span>
      )}
    </span>
  );
}

function ItemCard({
  item,
  team,
  picked,
  onPick,
  onEdit,
}: {
  item: LibraryItem;
  team: boolean;
  picked: boolean;
  onPick: () => void;
  onEdit: () => void;
}) {
  const body = (
    <>
      <Thumb item={item} />
      <span className="lib-meta">
        <strong dir="auto">{item.title}</strong>
        <span className="small muted">
          {[item.shoot, item.shotOn && shortDate(item.shotOn)].filter(Boolean).join(" · ")}
        </span>
        {item.tags.length > 0 && (
          <span className="lib-card-tags small">{item.tags.map(tagName).join(", ")}</span>
        )}
        {item.talent && (
          <span className="lib-usage small">
            {item.talent.name}
            {item.talent.usageTerms
              ? `: ${item.talent.usageTerms}`
              : t(": usage terms not set", " : conditions d'usage non définies")}
          </span>
        )}
      </span>
    </>
  );
  if (team)
    return (
      <li className="lib-card">
        <button type="button" className="lib-card-body" onClick={onEdit}>
          {body}
        </button>
        {item.link && (
          <a className="small" href={item.link} target="_blank" rel="noreferrer noopener">
            Open in Drive
          </a>
        )}
      </li>
    );
  return (
    <li className={`lib-card${picked ? " is-picked" : ""}`}>
      <button type="button" className="lib-card-body" aria-pressed={picked} onClick={onPick}>
        {body}
        <span className="lib-pick" aria-hidden="true">
          {picked ? "✓" : "+"}
        </span>
      </button>
    </li>
  );
}

function AskBar({
  target,
  count,
  ids,
  onSent,
}: {
  target: ResultsTarget;
  count: number;
  ids: string[];
  onSent: () => void;
}) {
  const { request } = useLibraryActions(target);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await request.mutateAsync({
      ids,
      body: String(new FormData(e.currentTarget).get("body") ?? ""),
    });
    setSent(true);
    setOpen(false);
    onSent();
  }

  if (sent)
    return (
      <p className="lib-ask done">
        {t("Sent. Gecko answers in Notes and links.", "Envoyé. Gecko répond dans Notes et liens.")}
      </p>
    );
  return (
    <form className="lib-ask" onSubmit={onSubmit}>
      <span>{plural(count, ["picked", "picked"], ["choisi", "choisis"])}</span>
      {open ? (
        <>
          <TextArea
            label={t("What should we make?", "Qu'est-ce qu'on en fait ?")}
            name="body"
            rows={2}
            maxLength={2000}
            placeholder={tw(
              [
                "A 10-second cutdown for stories, a new hook for the stain reel…",
                "Une version de 10 secondes pour les stories, une nouvelle accroche…",
              ],
              [
                "A teaser for the launch, a set of stills for the lookbook…",
                "Un teaser pour le lancement, une série pour le lookbook…",
              ],
            )}
          />
          {request.isError && <Notice tone="error">{friendlyError(request.error)}</Notice>}
          <div className="actions start">
            <Button type="submit" disabled={request.isPending}>
              {t("Send to Gecko", "Envoyer à Gecko")}
            </Button>
            <Button variant="link" onClick={() => setOpen(false)}>
              {t("Cancel", "Annuler")}
            </Button>
          </div>
        </>
      ) : (
        <Button onClick={() => setOpen(true)}>
          {t("Make something from these", "En faire quelque chose")}
        </Button>
      )}
    </form>
  );
}

function ItemForm({
  target,
  page,
  item,
  onDone,
}: {
  target: ResultsTarget;
  page: LibraryPage;
  item: LibraryItem | null;
  onDone: () => void;
}) {
  const { save, remove } = useLibraryActions(target);
  const [thumbs, setThumbs] = useState<string[]>(item?.thumb ? [item.thumb] : []);
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [error, setError] = useState("");
  const extra = tags.filter((x) => !BASE_TAGS.some(([k]) => k === x));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const length = String(f.get("seconds") ?? "").trim();
    const allTags = [
      ...tags.filter((x) => BASE_TAGS.some(([k]) => k === x)),
      ...parseTags(String(f.get("more") ?? "")),
    ];
    setError("");
    try {
      await save.mutateAsync({
        id: item?.id ?? null,
        kind: String(f.get("kind")) as ItemKind,
        title: String(f.get("title") ?? ""),
        shoot: String(f.get("shoot") ?? ""),
        shotOn: String(f.get("shotOn") ?? "") || null,
        tags: allTags,
        seconds: length ? Number(length.replace(",", ".")) : null,
        thumb: thumbs[0] ?? null,
        link: String(f.get("link") ?? "").trim(),
        talentId: String(f.get("talent") ?? "") || null,
      });
      onDone();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function onRemove() {
    if (!item || !window.confirm("Remove this from the library? The Drive file stays.")) return;
    try {
      await remove.mutateAsync({ id: item.id, thumb: item.thumb });
      onDone();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <form className="lib-form card" onSubmit={onSubmit}>
      <div className="lib-form-grid">
        <PhotoPicker
          target={target}
          value={thumbs}
          max={1}
          bucket={LIBRARY_BUCKET}
          label="Thumbnail"
          addLabel="+ Add a frame"
          onChange={setThumbs}
        />
        <div className="lib-form-fields">
          <Field
            label="What it shows"
            name="title"
            required
            maxLength={160}
            defaultValue={item?.title ?? ""}
          />
          <div className="post-form-row">
            <Select
              label="Type"
              name="kind"
              defaultValue={item?.kind ?? "clip"}
              options={[
                ["clip", "Clip"],
                ["still", "Still"],
              ]}
            />
            <Field
              label="Length (s)"
              name="seconds"
              inputMode="decimal"
              defaultValue={item?.seconds?.toString() ?? ""}
            />
          </div>
          <div className="post-form-row">
            <Field
              label="Shoot"
              name="shoot"
              maxLength={120}
              list="lib-shoots"
              placeholder="Shoot 12 Nov"
              defaultValue={item?.shoot ?? ""}
            />
            <Field label="Shot on" name="shotOn" type="date" defaultValue={item?.shotOn ?? ""} />
          </div>
          <datalist id="lib-shoots">
            {shootsInUse(page.items).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="field">
        <span className="label">Tags</span>
        <div className="lib-tags">
          {BASE_TAGS.map(([k, en]) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={tags.includes(k)}
              onClick={() => setTags(tags.includes(k) ? tags.filter((x) => x !== k) : [...tags, k])}
            >
              {en}
            </button>
          ))}
        </div>
      </div>
      <Field label="More tags, separated by commas" name="more" defaultValue={extra.join(", ")} />
      <Field
        label="Drive link (team only)"
        name="link"
        type="url"
        placeholder="https://drive.google.com/…"
        defaultValue={item?.link ?? ""}
      />
      {page.talent.length > 0 && (
        <Select
          label="Who's in it (their usage terms show on the clip)"
          name="talent"
          defaultValue={item?.talentId ?? ""}
          options={[
            ["", "No one from the cast"],
            ...page.talent.map((p) => [p.id, p.name] as const),
          ]}
        />
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="actions start">
        <Button type="submit" disabled={save.isPending}>
          {item ? "Save" : "Add to the library"}
        </Button>
        <Button variant="link" onClick={onDone}>
          Cancel
        </Button>
        {item && (
          <Button variant="link" className="danger" onClick={() => void onRemove()}>
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}
