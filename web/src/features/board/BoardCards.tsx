import { useEffect, useRef, type ReactNode } from "react";
import { isShortLink, mediaFromUrl, siteName } from "./embed";
import { useImageUrl } from "./boardApi";
import type { Card, CardData, NoteColor, Task } from "./model";

export interface CardProps {
  card: Card;
  editing: boolean;
  /** Merge new data into the card and save it. */
  onData: (data: Partial<CardData>) => void;
  onEdit: (editing: boolean) => void;
  /** Board cards open their board. */
  onOpen?: () => void;
  /** Set while any card is being dragged, so videos don't swallow the pointer. */
  dragging: boolean;
}

/** A textarea that grows with its text, for notes and captions. */
function Grow({
  value,
  onChange,
  placeholder,
  autoFocus,
  className = "",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      dir="auto"
      rows={1}
      aria-label={label}
      className={`grow no-drag ${className}`}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const COLORS: NoteColor[] = ["white", "yellow", "pink", "green"];

export function NoteCard({ card, editing, onData, onEdit }: CardProps) {
  const text = card.data.text ?? "";
  return (
    <div className={`bc-note note-${card.data.color ?? "white"}`}>
      {editing ? (
        <>
          <Grow
            label="Note"
            value={text}
            autoFocus
            placeholder="Write anything: a feeling, a line, a rule…"
            onChange={(v) => onData({ text: v })}
          />
          <div className="bc-colors no-drag" role="radiogroup" aria-label="Note colour">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={(card.data.color ?? "white") === c}
                aria-label={c}
                className={`swatch swatch-${c}`}
                onClick={() => onData({ color: c })}
              />
            ))}
          </div>
        </>
      ) : (
        <p
          dir="auto"
          className={`bc-text${text ? "" : " empty"}`}
          onDoubleClick={() => onEdit(true)}
        >
          {text || "Empty note. Double-click to write."}
        </p>
      )}
    </div>
  );
}

export function TodoCard({ card, editing, onData, onEdit }: CardProps) {
  const tasks = card.data.tasks ?? [];
  const set = (next: Task[]) => onData({ tasks: next });
  const done = tasks.filter((t) => t.done && t.text.trim()).length;
  const total = tasks.filter((t) => t.text.trim()).length;
  return (
    <div className="bc-todo">
      {editing ? (
        <input
          dir="auto"
          aria-label="List title"
          className="bc-title-input no-drag"
          autoFocus={!card.data.title}
          value={card.data.title ?? ""}
          placeholder="List title"
          onChange={(e) => onData({ title: e.target.value })}
        />
      ) : (
        <h4 dir="auto" onDoubleClick={() => onEdit(true)}>
          {card.data.title || "To-do"}
          {total > 0 && (
            <span className="muted">
              {" "}
              {done}/{total}
            </span>
          )}
        </h4>
      )}
      {tasks.length === 0 && !editing && (
        <p className="small muted bc-text" onDoubleClick={() => onEdit(true)}>
          Double-click to add tasks.
        </p>
      )}
      <ul>
        {tasks.map((task, i) => (
          <li key={i} className={task.done ? "done" : ""}>
            <input
              type="checkbox"
              className="no-drag"
              aria-label={task.text || "Task"}
              checked={task.done}
              onChange={(e) =>
                set(tasks.map((t, j) => (j === i ? { ...t, done: e.target.checked } : t)))
              }
            />
            {editing ? (
              <input
                dir="auto"
                aria-label="Task"
                className="no-drag"
                value={task.text}
                placeholder="Add a task"
                autoFocus={i === tasks.length - 1 && !task.text && Boolean(card.data.title)}
                onChange={(e) =>
                  set(tasks.map((t, j) => (j === i ? { ...t, text: e.target.value } : t)))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    set([
                      ...tasks.slice(0, i + 1),
                      { text: "", done: false },
                      ...tasks.slice(i + 1),
                    ]);
                  if (e.key === "Backspace" && !task.text && tasks.length > 1) {
                    e.preventDefault();
                    set(tasks.filter((_, j) => j !== i));
                  }
                }}
              />
            ) : (
              <span dir="auto" onDoubleClick={() => onEdit(true)}>
                {task.text || <span className="muted">Empty task</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
      {editing && tasks.length < 100 && (
        <button
          type="button"
          className="bc-add no-drag"
          onClick={() => set([...tasks, { text: "", done: false }])}
        >
          Add a task
        </button>
      )}
    </div>
  );
}

/** Links and videos share one card: paste a link, and if it's a video we can play, it plays. */
export function LinkCard({ card, editing, onData, onEdit, dragging }: CardProps) {
  const url = card.data.url ?? "";
  const media = url ? mediaFromUrl(url) : null;
  if (!url || editing)
    return (
      <div className="bc-link">
        <input
          className="bc-title-input no-drag"
          aria-label="Link"
          autoFocus
          inputMode="url"
          placeholder="Paste a link: Instagram, TikTok, YouTube, Pinterest, any site"
          defaultValue={url}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== url) onData({ url: /^https?:\/\//i.test(v) ? v : `https://${v}` });
            onEdit(false);
          }}
        />
        <p className="small muted">
          Videos play right on the board. Other links open in a new tab.
        </p>
      </div>
    );
  if (media)
    return (
      <div className={`bc-video provider-${media.provider}`}>
        <div className="bc-video-head">
          <span className="tag">{media.label}</span>
          {card.data.title && <span className="bc-video-title">{card.data.title}</span>}
          <a className="no-drag small" href={url} target="_blank" rel="noreferrer noopener">
            Open
          </a>
        </div>
        <div className="bc-player" style={{ aspectRatio: String(media.aspect) }}>
          {media.provider === "file" ? (
            <video src={media.src} controls preload="metadata" className="no-drag" />
          ) : (
            <iframe
              src={media.src}
              title={card.data.title || `${media.label} video`}
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
              style={{ pointerEvents: dragging ? "none" : "auto" }}
            />
          )}
        </div>
      </div>
    );
  return (
    <div className="bc-link">
      <span className="bc-site">{siteName(url)}</span>
      <a className="no-drag bc-url" href={url} target="_blank" rel="noreferrer noopener" dir="auto">
        {card.data.title || url}
      </a>
      {isShortLink(url) && (
        <p className="small muted">
          Short links can't play here. Open it, copy the full address from the browser and paste
          that instead.
        </p>
      )}
    </div>
  );
}

export function ImageCard({ card, editing, onData }: CardProps) {
  const src = useImageUrl(card.data.path);
  return (
    <figure className="bc-image">
      <div className="bc-image-box" style={{ aspectRatio: String(card.data.ratio ?? 1.5) }}>
        {src.data ? (
          <img src={src.data} alt={card.data.caption ?? ""} draggable={false} />
        ) : (
          <span className="small muted">{src.isError ? "Image not found" : "Loading…"}</span>
        )}
      </div>
      {editing ? (
        <Grow
          label="Caption"
          className="bc-caption"
          value={card.data.caption ?? ""}
          placeholder="Add a caption"
          autoFocus
          onChange={(v) => onData({ caption: v })}
        />
      ) : (
        card.data.caption && (
          <figcaption dir="auto" className="bc-caption">
            {card.data.caption}
          </figcaption>
        )
      )}
    </figure>
  );
}

export function TableCard({ card, editing, onData, onEdit }: CardProps) {
  const cols = card.data.cols ?? [];
  const rows = card.data.rows ?? [];
  const setCell = (r: number, c: number, v: string) =>
    onData({ rows: rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) });
  const cell = (value: string, label: string, set: (v: string) => void, head = false) =>
    editing ? (
      <input
        dir="auto"
        aria-label={label}
        className="no-drag"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    ) : (
      <span dir="auto" className={value ? "" : "muted"}>
        {value || (head ? "Column" : "")}
      </span>
    );
  return (
    <div className="bc-table" onDoubleClick={() => onEdit(true)}>
      {editing ? (
        <input
          dir="auto"
          aria-label="Table title"
          className="bc-title-input no-drag"
          value={card.data.title ?? ""}
          placeholder="Table title"
          onChange={(e) => onData({ title: e.target.value })}
        />
      ) : (
        <h4 dir="auto">{card.data.title || "Table"}</h4>
      )}
      <div className="bc-table-scroll no-drag">
        <table>
          <thead>
            <tr>
              <th className="bc-n">#</th>
              {cols.map((c, j) => (
                <th key={j}>
                  {cell(
                    c,
                    `Column ${j + 1}`,
                    (v) => onData({ cols: cols.map((x, k) => (k === j ? v : x)) }),
                    true,
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="bc-n">{i + 1}</td>
                {cols.map((_, j) => (
                  <td key={j}>
                    {cell(row[j] ?? "", `Row ${i + 1}, ${cols[j] || `column ${j + 1}`}`, (v) =>
                      setCell(i, j, v),
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="bc-table-actions no-drag">
          {rows.length < 60 && (
            <button
              type="button"
              className="bc-add"
              onClick={() => onData({ rows: [...rows, cols.map(() => "")] })}
            >
              Add a row
            </button>
          )}
          {cols.length < 10 && (
            <button
              type="button"
              className="bc-add"
              onClick={() => onData({ cols: [...cols, ""], rows: rows.map((r) => [...r, ""]) })}
            >
              Add a column
            </button>
          )}
          {rows.length > 1 && (
            <button
              type="button"
              className="bc-add"
              onClick={() => onData({ rows: rows.slice(0, -1) })}
            >
              Remove last row
            </button>
          )}
          {cols.length > 1 && (
            <button
              type="button"
              className="bc-add"
              onClick={() =>
                onData({ cols: cols.slice(0, -1), rows: rows.map((r) => r.slice(0, -1)) })
              }
            >
              Remove last column
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function BoardCard({ card, editing, onData, onOpen }: CardProps) {
  return (
    <div className="bc-board">
      <span className="bc-board-icon" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="bc-board-text">
        {editing ? (
          <input
            dir="auto"
            aria-label="Board name"
            className="bc-title-input no-drag"
            autoFocus
            value={card.data.title ?? ""}
            onChange={(e) => onData({ title: e.target.value })}
          />
        ) : (
          <button type="button" className="bc-board-open no-drag" onClick={onOpen}>
            {card.data.title || "Untitled board"}
          </button>
        )}
        <span className="small muted">
          {card.count == null ? "Board" : card.count === 1 ? "1 card" : `${card.count} cards`}
        </span>
      </span>
    </div>
  );
}

export function ColumnHead({
  card,
  editing,
  onData,
  onEdit,
  count,
}: CardProps & { count: number }) {
  return editing ? (
    <input
      dir="auto"
      aria-label="Column title"
      className="bc-title-input no-drag"
      autoFocus
      value={card.data.title ?? ""}
      placeholder="Column title"
      onChange={(e) => onData({ title: e.target.value })}
    />
  ) : (
    <h3 dir="auto" onDoubleClick={() => onEdit(true)}>
      {card.data.title || "Untitled column"}
      <span className="small muted">{count === 1 ? "1 card" : `${count} cards`}</span>
    </h3>
  );
}

export function CardBody(props: CardProps): ReactNode {
  switch (props.card.kind) {
    case "note":
      return <NoteCard {...props} />;
    case "todo":
      return <TodoCard {...props} />;
    case "link":
    case "video":
      return <LinkCard {...props} />;
    case "image":
      return <ImageCard {...props} />;
    case "table":
      return <TableCard {...props} />;
    case "board":
      return <BoardCard {...props} />;
    default:
      return null;
  }
}
