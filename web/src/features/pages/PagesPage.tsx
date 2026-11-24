// Pages and documents (Heni, 24 Nov 2026). Pages like Notion but simpler: type, press Enter, "/" for any block,
// "## " for a heading, "[] " for a to-do. Documents are the same pages printed on Gecko paper: briefs, proposals,
// call sheets, messages, exported to PDF (the browser's Save as PDF) or sent as text.
import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { toast } from "@/components/Toast";
import { useClients } from "@/features/clients/clientsApi";
import { whatsappLink } from "@/features/clients/messages";
import { useMembers } from "@/features/workspace/members";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { BrandIcon } from "@/components/BrandIcon";
import { ItemMenu } from "@/components/ItemMenu";
import { BlockRow } from "./BlockRow";
import { block, TEMPLATES, toText, type Block, type BlockType, type Template } from "./blocks";
import { usePage, usePageActions, usePages } from "./pagesApi";
import { SharePanel } from "./SharePanel";

export function PagesPage() {
  return (
    <Routes>
      <Route index element={<PagesHome />} />
      <Route path=":pageId" element={<PageEditor />} />
    </Routes>
  );
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function PagesHome() {
  const pages = usePages();
  const act = usePageActions();
  const navigate = useNavigate();
  const members = useMembers();
  const me = members.data?.find((m) => m.userId)?.name ?? "";
  const clients = useClients();
  const brand = (id: string | null) => clients.data?.find((c) => c.id === id)?.brand;
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"all" | "page" | "doc">("all");

  async function start(t: Template) {
    try {
      const id = await act.create.mutateAsync({
        title: t.key === "blank" ? "" : t.name,
        icon: t.icon,
        kind: t.kind,
        template: t.key,
        blocks: t.blocks(),
        authorName: me,
      });
      navigate(`/pages/${id}`);
    } catch (e) {
      toast({ text: friendlyError(e), tone: "error" });
    }
  }

  const list = (pages.data ?? []).filter(
    (p) =>
      (show === "all" || p.kind === show) &&
      (!q || `${p.title} ${brand(p.clientId) ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  const pinned = list.filter((p) => p.pinned);
  const rest = list.filter((p) => !p.pinned);

  return (
    <section className="page wide pages">
      <header className="page-head ceo-head">
        <div>
          <h1>Pages &amp; docs</h1>
          <p className="lede">Notes, plans and Gecko documents you can print to PDF or send.</p>
        </div>
        <Button onClick={() => void start(TEMPLATES[0]!)} disabled={act.create.isPending}>
          New page
        </Button>
      </header>

      <section className="hub-block">
        <div className="hub-head">
          <h2>Start from a template</h2>
        </div>
        <div className="tpl-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="tpl-card"
              disabled={act.create.isPending}
              onClick={() => void start(t)}
            >
              <span className="tpl-icon" aria-hidden="true">
                <Icon name={t.icon} size={18} />
              </span>
              <strong>{t.name}</strong>
              <span className="small">{t.blurb}</span>
              {t.kind === "doc" && <span className="tpl-tag">Gecko document</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="hub-block">
        <div className="hub-head pages-head">
          <h2>Your pages</h2>
          <div className="seg" role="group" aria-label="Show">
            {(["all", "page", "doc"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}>
                {k === "all" ? "All" : k === "page" ? "Pages" : "Documents"}
              </button>
            ))}
          </div>
          <input
            className="pages-search"
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search pages"
          />
        </div>
        {pages.isPending ? (
          <p className="loading">Loading</p>
        ) : pages.isError ? (
          <Notice tone="error">{friendlyError(pages.error)}</Notice>
        ) : list.length === 0 ? (
          <p className="empty-state">No pages yet. Start one above.</p>
        ) : (
          <ul className="page-list">
            {[...pinned, ...rest].map((p) => (
              <li key={p.id}>
                <Link to={`/pages/${p.id}`} className="page-row">
                  <span className="page-row-icon" aria-hidden="true">
                    <Icon name={iconOf(p.icon, p.template)} size={18} />
                  </span>
                  <span className="page-row-title" dir="auto">
                    <strong>{p.title || "Untitled"}</strong>
                    <span className="small">
                      {[
                        p.kind === "doc" ? "Document" : "Page",
                        brand(p.clientId),
                        p.authorName && `by ${p.authorName}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {p.pinned && <span className="small">Pinned</span>}
                  <span className="small">{ago(p.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

/** A page's icon: its stored name, else its template's, else a page. Older pages stored a glyph. */
function iconOf(icon: string, template: string): IconName {
  const names = new Set<string>(TEMPLATES.map((t) => t.icon));
  if (names.has(icon)) return icon as IconName;
  return TEMPLATES.find((t) => t.key === template)?.icon ?? "page";
}

const LISTY: BlockType[] = ["bullet", "number", "todo"];

function PageEditor() {
  const { pageId } = useParams();
  const page = usePage(pageId);
  const act = usePageActions();
  const navigate = useNavigate();
  const { role } = useWorkspace();
  const clients = useClients();
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [focus, setFocus] = useState<{ id: string; at: "start" | "end" } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; at: "above" | "below" } | null>(null);
  const shareBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareMenu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !shareBox.current?.contains(e.target as Node)
      )
        setShareMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [shareMenu]);

  useEffect(() => {
    if (page.data && loaded !== page.data.id) {
      setTitle(page.data.title);
      setBlocks(page.data.blocks.length ? page.data.blocks : [block("text")]);
      setLoaded(page.data.id);
    }
  }, [page.data, loaded]);

  // Saves a moment after you stop typing.
  useEffect(() => {
    if (!dirty || !pageId) return;
    const t = window.setTimeout(() => {
      setSaving("saving");
      act.save
        .mutateAsync({ id: pageId, title, blocks })
        .then(() => {
          setSaving("saved");
          setDirty(false);
        })
        .catch((e: unknown) => {
          setSaving("idle");
          toast({ text: friendlyError(e), tone: "error" });
        });
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, blocks, dirty, pageId]);

  const change = (next: Block[]) => {
    setBlocks(next);
    setDirty(true);
  };

  if (page.isPending) return <p className="loading">Loading</p>;
  if (page.isError) return <Notice tone="error">{friendlyError(page.error)}</Notice>;
  if (!page.data) return <Notice>This page is gone (maybe in the Trash).</Notice>;
  const p = page.data;
  const doc = p.kind === "doc";
  const clientBrand = clients.data?.find((c) => c.id === p.clientId)?.brand ?? "";
  const text = toText(title || "Untitled", blocks);

  const at = (id: string) => blocks.findIndex((b) => b.id === id);
  const update = (id: string, patch: Partial<Block>) =>
    change(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const insertAfter = (id: string, b: Block) => {
    const i = at(id);
    change([...blocks.slice(0, i + 1), b, ...blocks.slice(i + 1)]);
    setFocus({ id: b.id, at: "start" });
  };
  const remove = (id: string) => {
    const i = at(id);
    if (blocks.length === 1) return change([block("text")]);
    const prev = blocks[i - 1] ?? blocks[i + 1];
    change(blocks.filter((b) => b.id !== id));
    if (prev) setFocus({ id: prev.id, at: "end" });
  };
  const move = (id: string, d: -1 | 1) => {
    const i = at(id);
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j]!, next[i]!];
    change(next);
  };
  const dropOn = (id: string, where: "above" | "below") => {
    if (!dragId || dragId === id) return;
    const moving = blocks.find((b) => b.id === dragId);
    if (!moving) return;
    const rest = blocks.filter((b) => b.id !== dragId);
    const k = rest.findIndex((b) => b.id === id) + (where === "below" ? 1 : 0);
    change([...rest.slice(0, k), moving, ...rest.slice(k)]);
  };
  const copyText = () =>
    void navigator.clipboard
      .writeText(text)
      .then(() => toast({ text: "Copied as text" }))
      .catch(() => toast({ text: "Couldn't copy", tone: "error" }));

  return (
    <section className={`page wide page-editor${doc ? " is-doc" : ""}`}>
      <div className="editor-bar no-print">
        <nav className="crumbs small">
          <Link to="/pages">Pages</Link>
          <span aria-hidden="true">/</span>
          <span>{title || "Untitled"}</span>
        </nav>
        <span className="small editor-saved" aria-live="polite">
          {saving === "saving" ? "Saving…" : dirty ? "Editing" : saving === "saved" ? "Saved" : ""}
        </span>
        <div className="editor-actions">
          <select
            className="editor-client"
            aria-label="Client"
            value={p.clientId ?? ""}
            onChange={(e) =>
              void act.save
                .mutateAsync({ id: p.id, clientId: e.target.value || null })
                .then(() => void page.refetch())
            }
          >
            <option value="">No client</option>
            {(clients.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand}
              </option>
            ))}
          </select>
          <div className="share-box" ref={shareBox}>
            <Button
              aria-expanded={shareMenu}
              aria-haspopup="menu"
              onClick={() => setShareMenu(!shareMenu)}
            >
              Share
            </Button>
            {shareMenu && (
              <div className="share-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => (copyText(), setShareMenu(false))}
                >
                  <Icon name="page" size={16} /> Copy as text
                </button>
                <a
                  role="menuitem"
                  className="no-mark"
                  href={whatsappLink(text)}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => setShareMenu(false)}
                >
                  <BrandIcon name="whatsapp" /> Send on WhatsApp
                </a>
                <a
                  role="menuitem"
                  href={`mailto:?subject=${encodeURIComponent(title || "Gecko")}&body=${encodeURIComponent(text)}`}
                  onClick={() => setShareMenu(false)}
                >
                  <Icon name="mail" size={16} /> Email
                </a>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => (setSharing(true), setShareMenu(false))}
                >
                  <Icon name="at" size={16} /> Public link
                  {["quote", "proposal"].includes(p.template) ? ", to accept" : ""}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => (setShareMenu(false), window.setTimeout(() => window.print(), 50))}
                >
                  <Icon name="receipt" size={16} /> {doc ? "Save as PDF" : "Print or save as PDF"}
                </button>
              </div>
            )}
          </div>
          <ItemMenu
            label="Page options"
            actions={[
              {
                label: p.pinned ? "Unpin from the top" : "Pin to the top",
                onSelect: () =>
                  void act.save
                    .mutateAsync({ id: p.id, pinned: !p.pinned })
                    .then(() => void page.refetch()),
              },
              { label: "Copy as text", onSelect: copyText },
              {
                label: "Move to the trash",
                danger: true,
                hidden: !(role === "founder" || role === "sales"),
                onSelect: () =>
                  void act.remove.mutateAsync(p.id).then(() => {
                    toast({ text: "Moved to the trash", detail: title || "Untitled" });
                    navigate("/pages");
                  }),
              },
            ]}
          />
        </div>
      </div>

      {sharing && (
        <div className="no-print share-panel-wrap">
          <button
            type="button"
            className="share-close"
            aria-label="Close"
            onClick={() => setSharing(false)}
          >
            ×
          </button>
          <SharePanel
            pageId={p.id}
            title={title}
            acceptable={["quote", "proposal"].includes(p.template)}
          />
        </div>
      )}
      <article className={`paper tpl-${p.template || "blank"}`}>
        {doc && (
          <header className="paper-cover">
            <div className="paper-cover-top">
              <Logo className="paper-logo" />
              <span className="paper-kind">
                {TEMPLATES.find((x) => x.key === p.template)?.name ?? "Document"}
              </span>
            </div>
            <div className="paper-cover-meta">
              {clientBrand && <span>For {clientBrand}</span>}
              <span>
                {new Date(p.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </header>
        )}
        <div className="paper-title">
          <span className="paper-icon" aria-hidden="true">
            <Icon name={iconOf(p.icon, p.template)} size={30} />
          </span>
          <input
            className="paper-title-input"
            value={title}
            placeholder="Untitled"
            aria-label="Title"
            maxLength={200}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                if (blocks[0]) setFocus({ id: blocks[0].id, at: "start" });
              }
            }}
          />
        </div>
        <div className="blocks">
          {blocks.map((b, i) => (
            <BlockRow
              key={b.id}
              b={b}
              n={numberOf(blocks, i)}
              focus={focus?.id === b.id ? focus.at : null}
              onFocused={() => setFocus(null)}
              onChange={(patch) => update(b.id, patch)}
              onEnter={(rest) => {
                if (LISTY.includes(b.type) && !b.text.trim()) return update(b.id, { type: "text" });
                insertAfter(b.id, block(LISTY.includes(b.type) ? b.type : "text", rest));
              }}
              onRemove={() => remove(b.id)}
              onUp={() => blocks[i - 1] && setFocus({ id: blocks[i - 1]!.id, at: "end" })}
              onDown={() => blocks[i + 1] && setFocus({ id: blocks[i + 1]!.id, at: "start" })}
              onMove={(d) => move(b.id, d)}
              onDuplicate={() => insertAfter(b.id, { ...b, id: block("text").id })}
              onAddBelow={() => insertAfter(b.id, block("text", "/"))}
              drag={{
                over: over?.id === b.id && dragId !== b.id ? over.at : null,
                onStart: () => setDragId(b.id),
                onOver: (e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const at = e.clientY < r.top + r.height / 2 ? "above" : "below";
                  if (over?.id !== b.id || over.at !== at) setOver({ id: b.id, at });
                },
                onDrop: () => {
                  if (over) dropOn(over.id, over.at);
                  setDragId(null);
                  setOver(null);
                },
                onEnd: () => {
                  setDragId(null);
                  setOver(null);
                },
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="blocks-add no-print"
          aria-label="Add a block at the end"
          onClick={() => {
            const last = blocks[blocks.length - 1];
            if (last && last.type === "text" && !last.text)
              return setFocus({ id: last.id, at: "start" });
            const nb = block("text");
            change([...blocks, nb]);
            setFocus({ id: nb.id, at: "start" });
          }}
        >
          <span>Click to write · type / for tables, embeds, a calculator and more</span>
        </button>
        {doc && (
          <footer className="paper-foot">
            <Logo className="paper-foot-logo" />
            <span>Video ads that sell · Tunis</span>
            <span>gecko-creative.com</span>
            <span>contact@gecko-creative.com</span>
          </footer>
        )}
      </article>
    </section>
  );
}

/** The number a numbered-list block shows: counts up through a run of numbered blocks. */
function numberOf(blocks: readonly Block[], i: number): number {
  let n = 0;
  for (let j = i; j >= 0 && blocks[j]?.type === "number"; j--) n++;
  return n;
}
