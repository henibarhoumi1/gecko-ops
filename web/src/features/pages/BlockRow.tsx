// One block of a page, in the editor: the text you type, and the richer blocks (table, calculator, embed, image,
// toggle). On hover a "+" adds a block under it and the grip opens its menu or drags it somewhere else.
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ImageDrop } from "@/components/ImageDrop";
import {
  BLOCK_MENU,
  calculate,
  columnTotal,
  computeRows,
  embedOf,
  fmtNum,
  newTable,
  shortcut,
  TABLE_PRESETS,
  type Block,
  type BlockGroup,
  type BlockType,
} from "./blocks";

const GROUPS: BlockGroup[] = ["Write", "Lists", "Data", "Media"];

/** Drawn marks for the block menus (letters for headings and text). */
const GLYPHS: Partial<Record<BlockType, string>> = {
  quote: "M6 8h4v4H6zM6 12c0 3-1 5-2.5 6M14 8h4v4h-4zM14 12c0 3-1 5-2.5 6",
  callout: "M4 5h16v11H9l-5 4z",
  toggle: "M9 6l6 6-6 6",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4",
  divider: "M4 12h16",
  todo: "M5 5h14v14H5zM8.5 12l2.5 2.5L16 9.5",
  bullet: "M10 7h10M10 12h10M10 17h10M5 7h.01M5 12h.01M5 17h.01",
  number: "M10 7h10M10 12h10M10 17h10M4 5.5l1.5-1v4",
  table: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
  calc: "M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01",
  field: "M4 7h5M4 12h5M4 17h5M12 7h8M12 12h8M12 17h8",
  embed: "M4 6h16v12H4zM10 9.5l4.5 2.5-4.5 2.5z",
  image: "M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 3-3 5 5M9 9.5h.01",
};
const LETTERS: Partial<Record<BlockType, string>> = { text: "Aa", h1: "H1", h2: "H2", h3: "H3" };

export function Glyph({ type }: { type: BlockType }) {
  const d = GLYPHS[type];
  return (
    <span className="glyph" aria-hidden="true">
      {d ? (
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        LETTERS[type]
      )}
    </span>
  );
}

export interface RowProps {
  b: Block;
  n: number;
  focus: "start" | "end" | null;
  onFocused: () => void;
  onChange: (patch: Partial<Block>) => void;
  onEnter: (rest: string) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  onMove: (d: -1 | 1) => void;
  onDuplicate: () => void;
  onAddBelow: () => void;
  drag: {
    onStart: () => void;
    onOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: () => void;
    onEnd: () => void;
    over: "above" | "below" | null;
  };
}

/** What a block becomes when picked from a menu: tables start with three columns, the rest start empty. */
export function asType(type: BlockType): Partial<Block> {
  if (type === "table") return { type, text: "", rows: newTable() };
  if (type === "toggle") return { type, text: "", open: true, body: "" };
  return { type, text: "" };
}

export function BlockRow(p: RowProps) {
  const { b, n, focus, onFocused, onChange } = p;
  const ref = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState(0);
  const [tools, setTools] = useState(false);
  const textual = !["table", "embed", "image", "divider"].includes(b.type);
  const slash = textual && b.text.startsWith("/") ? b.text.slice(1).toLowerCase() : null;
  const options = useMemo(
    () =>
      slash === null
        ? []
        : BLOCK_MENU.filter((m) => `${m.label} ${m.hint}`.toLowerCase().includes(slash)),
    [slash],
  );

  const presets = useMemo(
    () =>
      slash === null
        ? []
        : TABLE_PRESETS.filter((t) => `${t.name} ${t.hint} table`.toLowerCase().includes(slash)),
    [slash],
  );
  const total = options.length + presets.length;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [b.text, b.type]);

  useEffect(() => {
    if (!focus) return;
    const el = ref.current;
    if (el) {
      el.focus();
      const pos = focus === "start" ? 0 : el.value.length;
      el.setSelectionRange(pos, pos);
    }
    onFocused();
  }, [focus, onFocused]);

  const pickPreset = (j: number) => {
    const t = presets[j];
    if (!t) return;
    onChange({
      type: "table",
      text: "",
      rows: t.rows.map((r) => r.slice()),
      calcCols: t.calcCols ?? [],
    });
    setMenu(0);
  };
  const pick = (type: BlockType) => {
    onChange(asType(type));
    setMenu(0);
    window.setTimeout(() => ref.current?.focus(), 0);
  };

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    if (slash !== null && total) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        setMenu((m) => (m + d + total) % total);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (menu < options.length) pick(options[menu]!.type);
        else pickPreset(menu - options.length);
        return;
      }
      if (e.key === "Escape") {
        onChange({ text: "" });
        return;
      }
    }
    // Alt + arrows move the block, like in Notion.
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      p.onMove(e.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && b.type !== "callout" && b.type !== "code") {
      e.preventDefault();
      const rest = el.value.slice(el.selectionEnd);
      onChange({ text: el.value.slice(0, el.selectionStart) });
      p.onEnter(rest);
    } else if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (b.type !== "text") {
        e.preventDefault();
        onChange({ type: "text" });
      } else if (!b.text) {
        e.preventDefault();
        p.onRemove();
      }
    } else if (e.key === "ArrowUp" && el.selectionStart === 0) {
      e.preventDefault();
      p.onUp();
    } else if (e.key === "ArrowDown" && el.selectionStart === el.value.length) {
      e.preventDefault();
      p.onDown();
    }
  }

  const close = (f: () => void) => () => {
    f();
    setTools(false);
  };

  const chrome = (
    <div className="blk-tools no-print">
      <button
        type="button"
        className="blk-add"
        aria-label="Add a block below"
        onClick={p.onAddBelow}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        className="blk-grip"
        aria-label="Block menu, or drag to move"
        aria-expanded={tools}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          p.drag.onStart();
        }}
        onDragEnd={p.drag.onEnd}
        onClick={() => setTools(!tools)}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          {[4, 8, 12].map((y) =>
            [6, 10].map((x) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="1.2" fill="currentColor" />
            )),
          )}
        </svg>
      </button>
      {tools && (
        <div className="blk-menu" role="menu" onMouseLeave={() => setTools(false)}>
          <p className="blk-menu-k">Turn into</p>
          <div className="blk-menu-grid">
            {BLOCK_MENU.filter((m) => m.type !== "divider").map((m) => (
              <button
                key={m.type}
                type="button"
                role="menuitem"
                className={m.type === b.type ? "is-on" : undefined}
                onClick={close(() =>
                  onChange(
                    ["table", "toggle"].includes(m.type) && m.type !== b.type
                      ? { ...asType(m.type), text: b.text }
                      : { type: m.type },
                  ),
                )}
              >
                <Glyph type={m.type} />
                {m.label}
              </button>
            ))}
          </div>
          <hr />
          <button type="button" role="menuitem" onClick={close(() => p.onMove(-1))}>
            Move up <kbd>⌥↑</kbd>
          </button>
          <button type="button" role="menuitem" onClick={close(() => p.onMove(1))}>
            Move down <kbd>⌥↓</kbd>
          </button>
          <button type="button" role="menuitem" onClick={close(p.onDuplicate)}>
            Duplicate
          </button>
          <button type="button" role="menuitem" className="danger" onClick={close(p.onRemove)}>
            Delete
          </button>
        </div>
      )}
    </div>
  );

  const shell = (inner: ReactNode, extra = "") => (
    <div
      data-id={b.id}
      className={`blk blk-${b.type}${b.checked ? " is-checked" : ""}${p.drag.over ? ` drop-${p.drag.over}` : ""}${extra}`}
      onDragOver={p.drag.onOver}
      onDrop={(e) => {
        e.preventDefault();
        p.drag.onDrop();
      }}
    >
      {chrome}
      {inner}
    </div>
  );

  if (b.type === "divider") return shell(<hr />);
  if (b.type === "table") return shell(<TableEdit b={b} onChange={onChange} />);
  if (b.type === "embed") return shell(<EmbedEdit b={b} onChange={onChange} />);
  if (b.type === "image") return shell(<ImageEdit b={b} onChange={onChange} />);

  const result = b.type === "calc" ? calculate(b.text) : null;
  return shell(
    <>
      {b.type === "todo" && (
        <input
          type="checkbox"
          className="blk-check"
          checked={Boolean(b.checked)}
          onChange={(e) => onChange({ checked: e.target.checked })}
          aria-label="Done"
        />
      )}
      {b.type === "toggle" && (
        <button
          type="button"
          className={`blk-fold${b.open ? " is-open" : ""}`}
          aria-label={b.open ? "Fold" : "Open"}
          aria-expanded={Boolean(b.open)}
          onClick={() => onChange({ open: !b.open })}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {b.type === "calc" && (
        <span className="blk-eq" aria-hidden="true">
          =
        </span>
      )}
      {b.type === "bullet" && <span className="blk-mark">•</span>}
      {b.type === "number" && <span className="blk-mark">{n}.</span>}
      {b.type === "field" && (
        <input
          className="blk-label"
          value={b.label ?? ""}
          placeholder="Label"
          aria-label="Label"
          onChange={(e) => onChange({ label: e.target.value })}
        />
      )}
      <textarea
        ref={ref}
        rows={1}
        dir="auto"
        spellCheck={b.type !== "code" && b.type !== "calc"}
        value={b.text}
        placeholder={
          b.type === "text"
            ? "Write, or type / for tables, embeds, a calculator…"
            : b.type === "calc"
              ? "2,900 × 3 + 15%"
              : BLOCK_MENU.find((m) => m.type === b.type)?.label
        }
        onChange={(e) => {
          const v = e.target.value;
          const s = b.type === "text" ? shortcut(v) : null;
          if (s) onChange({ ...asType(s.type), text: s.rest });
          else onChange({ text: v });
          setMenu(0);
        }}
        onKeyDown={onKeyDown}
      />
      {b.type === "calc" && (
        <button
          type="button"
          className={`blk-result${result === null ? " is-empty" : ""}`}
          title="Copy the result"
          disabled={result === null}
          onClick={() => result !== null && void navigator.clipboard?.writeText(String(result))}
        >
          {result === null ? (b.text.trim() ? "…" : "") : fmtNum(result)}
        </button>
      )}
      {b.type === "toggle" && b.open && (
        <Grow
          className="blk-body"
          value={b.body ?? ""}
          placeholder="What's inside"
          onChange={(v) => onChange({ body: v })}
        />
      )}
      {slash !== null && options.length + presets.length > 0 && (
        <div className="slash-menu no-print" role="listbox" aria-label="Blocks">
          {GROUPS.map((g) => {
            const list = options.filter((o) => o.group === g);
            if (!list.length) return null;
            return (
              <div key={g} className="slash-group">
                <p className="slash-k">{g}</p>
                {list.map((m) => {
                  const i = options.indexOf(m);
                  return (
                    <button
                      key={m.type}
                      type="button"
                      role="option"
                      aria-selected={i === menu}
                      onMouseEnter={() => setMenu(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(m.type);
                      }}
                    >
                      <Glyph type={m.type} />
                      <span className="slash-t">
                        <strong>{m.label}</strong>
                        <span>{m.hint}</span>
                      </span>
                      {m.keys && <kbd>{m.keys}</kbd>}
                    </button>
                  );
                })}
                {presets.length > 0 && (
                  <div className="slash-group">
                    <p className="slash-k">Studio tables</p>
                    {presets.map((t, j) => {
                      const i = options.length + j;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          role="option"
                          aria-selected={i === menu}
                          onMouseEnter={() => setMenu(i)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickPreset(j);
                          }}
                        >
                          <Glyph type="table" />
                          <span className="slash-t">
                            <strong>{t.name}</strong>
                            <span>{t.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>,
    b.type === "toggle" ? " has-body" : "",
  );
}

/** A textarea that grows with what's typed. */
function Grow({
  value,
  onChange,
  placeholder,
  className,
  label,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      dir="auto"
      className={className}
      value={value}
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

/** A table: click any cell to type, Tab to move on, Enter on the last row adds a row. Number columns add up. */
function TableEdit({ b, onChange }: { b: Block; onChange: (patch: Partial<Block>) => void }) {
  const rows = b.rows?.length ? b.rows : newTable();
  const w = rows[0]?.length ?? 1;
  const set = (r: number, c: number, v: string) =>
    onChange({
      rows: rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)),
    });
  const addRow = () => onChange({ rows: [...rows, Array<string>(w).fill("")] });
  const addCol = () =>
    w < 12 && onChange({ rows: rows.map((row, i) => [...row, i === 0 ? `Column ${w + 1}` : ""]) });
  const delRow = (r: number) =>
    rows.length > 2 && onChange({ rows: rows.filter((_, i) => i !== r) });
  // Removing a column clears the worked-out columns, since their inputs move.
  const delCol = (c: number) =>
    w > 1 && onChange({ rows: rows.map((row) => row.filter((_, j) => j !== c)), calcCols: [] });
  const shown = computeRows(rows, b.calcCols);
  const auto = new Set((b.calcCols ?? []).map((k) => k.c));
  const totals = Array.from({ length: w }, (_, c) => columnTotal(shown, c));
  const anyTotal = totals.some((t) => t !== null);
  const blank = rows.slice(1).every((r) => r.every((x) => !x.trim()));
  return (
    <div className="tbl-wrap">
      {blank && (
        <label className="tbl-start no-print">
          <span>Start from</span>
          <select
            value=""
            onChange={(e) => {
              const t = TABLE_PRESETS.find((x) => x.key === e.target.value);
              if (t) onChange({ rows: t.rows.map((r) => r.slice()), calcCols: t.calcCols ?? [] });
            }}
          >
            <option value="">a studio table…</option>
            {TABLE_PRESETS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <table className="tbl">
        <thead>
          <tr>
            {rows[0]!.map((h, c) => (
              <th key={c}>
                <Grow value={h} label={`Column ${c + 1} name`} onChange={(v) => set(0, c, v)} />
                {auto.has(c) && <span className="tbl-auto-k">auto</span>}
                {w > 1 && (
                  <button
                    type="button"
                    className="tbl-x no-print"
                    aria-label="Remove column"
                    onClick={() => delCol(c)}
                  >
                    ×
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, r) => (
            <tr key={r}>
              {row.map((v, c) => (
                <td
                  key={c}
                  className={`${totals[c] !== null || auto.has(c) ? "is-num" : ""}${auto.has(c) ? " is-auto" : ""}`}
                >
                  {auto.has(c) ? (
                    <span className="tbl-auto">
                      {shown[r + 1]?.[c] ? fmtNum(Number(shown[r + 1]![c])) : ""}
                    </span>
                  ) : (
                    <Grow
                      value={v}
                      label={`${rows[0]![c] || `Column ${c + 1}`}, row ${r + 1}`}
                      onChange={(x) => set(r + 1, c, x)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && r === rows.length - 2) {
                          e.preventDefault();
                          addRow();
                        }
                      }}
                    />
                  )}
                  {c === w - 1 && rows.length > 2 && (
                    <button
                      type="button"
                      className="tbl-x tbl-xr no-print"
                      aria-label="Remove row"
                      onClick={() => delRow(r + 1)}
                    >
                      ×
                    </button>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {anyTotal && (
          <tfoot>
            <tr>
              {totals.map((t, c) => (
                <td key={c} className={t !== null ? "is-num" : undefined}>
                  {t !== null ? fmtNum(t) : c === 0 ? "Total" : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      <div className="tbl-add no-print">
        <button type="button" onClick={addRow}>
          + Row
        </button>
        <button type="button" onClick={addCol} disabled={w >= 12}>
          + Column
        </button>
      </div>
    </div>
  );
}

function LinkInput({ onSave, hint }: { onSave: (url: string) => void; hint: string }) {
  const [v, setV] = useState("");
  const ok = /^https?:\/\/\S+\.\S+/i.test(v.trim());
  return (
    <form
      className="blk-url"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave(v.trim());
      }}
    >
      <input
        type="url"
        value={v}
        placeholder={hint}
        aria-label={hint}
        onChange={(e) => setV(e.target.value)}
        autoFocus
      />
      <button type="submit" className="btn btn-primary" disabled={!ok}>
        Add
      </button>
    </form>
  );
}

/** A video, a Google doc, a Figma file, a map, a post: playing right in the page. Other links become a card. */
function EmbedEdit({ b, onChange }: { b: Block; onChange: (patch: Partial<Block>) => void }) {
  if (!b.url)
    return (
      <LinkInput
        hint="Paste a link: YouTube, Google Drive or Docs, Figma, Maps, Instagram, TikTok, Loom…"
        onSave={(url) => onChange({ url })}
      />
    );
  return (
    <figure className="blk-media">
      <EmbedView url={b.url} />
      <figcaption>
        <Grow value={b.text} placeholder="Add a caption" onChange={(text) => onChange({ text })} />
        <button
          type="button"
          className="blk-swap no-print"
          onClick={() => onChange({ url: undefined })}
        >
          Change link
        </button>
      </figcaption>
    </figure>
  );
}

export function EmbedView({ url }: { url: string }) {
  const e = embedOf(url);
  if (!e) return null;
  if (e.kind === "frame")
    return (
      <div className="embed-frame" style={{ aspectRatio: e.ratio }}>
        <iframe
          src={e.src}
          title={`Embedded from ${e.host}`}
          loading="lazy"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"
        />
      </div>
    );
  return (
    <a className="embed-card" href={url} target="_blank" rel="noreferrer noopener">
      <img
        src={`https://www.google.com/s2/favicons?domain=${e.host}&sz=64`}
        alt=""
        width="28"
        height="28"
      />
      <span>
        <strong>{e.host}</strong>
        <span>{url}</span>
      </span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function ImageEdit({ b, onChange }: { b: Block; onChange: (patch: Partial<Block>) => void }) {
  if (!b.url)
    return (
      <ImageDrop
        label=""
        value=""
        hint="Drop an image here, paste it (⌘V), or click to upload"
        onChange={(url) => onChange({ url })}
      />
    );
  return (
    <figure className="blk-media">
      <img className="blk-img" src={b.url} alt={b.text} loading="lazy" />
      <figcaption>
        <Grow value={b.text} placeholder="Add a caption" onChange={(text) => onChange({ text })} />
        <button
          type="button"
          className="blk-swap no-print"
          onClick={() => onChange({ url: undefined })}
        >
          Change image
        </button>
      </figcaption>
    </figure>
  );
}
