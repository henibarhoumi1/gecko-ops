import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { friendlyError } from "@/lib/errors";
import { BoardCards } from "./BoardParts";
import {
  boardKey,
  boardRev,
  deleteCards,
  IMAGE_TYPES,
  renameBoard,
  saveCards,
  uploadImage,
  useBoard,
  type BoardTarget,
} from "./boardApi";
import { mediaFromUrl } from "./embed";
import {
  blankCard,
  campaignTemplate,
  columnCards,
  DEFAULT_WIDTH,
  edgePoint,
  freeSpot,
  KIND_LABEL,
  positionAt,
  type BoardPage,
  type Card,
  type CardData,
  type CardKind,
  type Rect,
} from "./model";

interface View {
  x: number;
  y: number;
  zoom: number;
}

type Drag =
  | {
      type: "move";
      ids: string[];
      start: { x: number; y: number };
      origin: Map<string, { x: number; y: number }>;
      moved: boolean;
      fromColumn: Map<string, string | null>;
    }
  | { type: "pan"; start: { x: number; y: number }; view: View; moved: boolean }
  | { type: "resize"; id: string; start: number; w: number }
  | { type: "pinch"; dist: number; mid: { x: number; y: number }; view: View };

const TOOLS: Exclude<CardKind, "arrow" | "video">[] = [
  "note",
  "todo",
  "link",
  "image",
  "table",
  "column",
  "board",
];

const POLL_MS = 3000;
/** Leaves room for the toolbar on the left (it sits at the bottom on phones). */
const START_X = typeof window !== "undefined" && window.innerWidth < 720 ? 20 : 110;
const SAVE_MS = 450;

/**
 * The shared board: a canvas of cards that the team and the client both move, write on and fill with links,
 * videos and images. Changes save on their own and show on the other side within a few seconds.
 */
export function BoardView({
  target,
  boardId,
  onOpenBoard,
  reader,
}: {
  target: BoardTarget;
  boardId: string | null;
  onOpenBoard: (id: string | null) => void;
  reader: "team" | "client";
}) {
  const page = useBoard(target, boardId);
  const queryClient = useQueryClient();
  const [cards, setCards] = useState<Card[]>([]);
  const [view, setView] = useState<View>({ x: START_X, y: 40, zoom: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [arrowFrom, setArrowFrom] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [dropColumn, setDropColumn] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);
  const touches = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pending = useRef<Map<string, Card>>(new Map());
  const timer = useRef<number | undefined>(undefined);
  const knownRev = useRef(0);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const viewRef = useRef(view);
  viewRef.current = view;

  const id = page.data?.board.id ?? null;

  // ---------- loading and merging what the server says ----------

  useEffect(() => {
    const data = page.data;
    if (!data) return;
    knownRev.current = Math.max(knownRev.current, data.board.rev);
    setCards((prev) => {
      const keep = new Set([...pending.current.keys(), ...(editing ? [editing] : [])]);
      if (drag.current?.type === "move") drag.current.ids.forEach((i) => keep.add(i));
      const local = new Map(prev.map((c) => [c.id, c]));
      const fromServer = data.items.map((c) =>
        keep.has(c.id) && local.has(c.id) ? local.get(c.id)! : c,
      );
      const unsaved = [...pending.current.values()].filter(
        (c) => !data.items.some((s) => s.id === c.id),
      );
      return [...fromServer, ...unsaved];
    });
    // editing is read for the merge only; a change of editing alone must not re-merge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.data]);

  // A new board starts with a clean slate.
  useEffect(() => {
    pending.current.clear();
    knownRev.current = 0;
    setSelected(new Set());
    setEditing(null);
    setArrowFrom(undefined);
    setView({ x: START_X, y: 40, zoom: 1 });
  }, [boardId]);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: boardKey(target, boardId) }),
    [queryClient, target, boardId],
  );

  // Poll one number; reload only when someone else changed the board.
  useEffect(() => {
    if (!id) return;
    const tick = window.setInterval(() => {
      if (document.hidden || drag.current || pending.current.size > 0) return;
      boardRev(target, id).then(
        (rev) => {
          if (rev > knownRev.current) void refresh();
        },
        () => undefined,
      );
    }, POLL_MS);
    return () => window.clearInterval(tick);
  }, [id, target, refresh]);

  // ---------- saving ----------

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!id || pending.current.size === 0) return;
    const batch = [...pending.current.values()];
    pending.current.clear();
    try {
      const rev = await saveCards(target, id, batch);
      knownRev.current = Math.max(knownRev.current, rev);
      setError("");
      // a new board card needs its inner board's id from the server
      if (batch.some((c) => c.kind === "board" && !c.data.boardId)) void refresh();
    } catch (e) {
      setError(friendlyError(e));
      void refresh();
    }
  }, [id, target, refresh]);

  const queue = useCallback(
    (list: Card[], now = false) => {
      for (const c of list) pending.current.set(c.id, c);
      window.clearTimeout(timer.current);
      if (now) void flush();
      else timer.current = window.setTimeout(() => void flush(), SAVE_MS);
    },
    [flush],
  );

  // Save before leaving the page or the board.
  useEffect(() => {
    const save = () => void flush();
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("beforeunload", save);
      save();
    };
  }, [flush]);

  const update = useCallback(
    (cardId: string, change: Partial<Card>, now = false) => {
      const current = cardsRef.current.find((c) => c.id === cardId);
      if (!current) return;
      const next = { ...current, ...change };
      cardsRef.current = cardsRef.current.map((c) => (c.id === cardId ? next : c));
      setCards((prev) => prev.map((c) => (c.id === cardId ? next : c)));
      queue([next], now);
    },
    [queue],
  );

  const setData = useCallback(
    (cardId: string, data: Partial<CardData>) => {
      const current = cardsRef.current.find((c) => c.id === cardId);
      if (!current) return;
      update(cardId, { data: { ...current.data, ...data } });
    },
    [update],
  );

  const remove = useCallback(
    async (ids: string[]) => {
      if (!id || ids.length === 0) return;
      const doomed = new Set(ids);
      for (const i of ids) pending.current.delete(i);
      setCards((prev) =>
        prev
          .filter(
            (c) =>
              !doomed.has(c.id) &&
              !(
                c.kind === "arrow" &&
                (doomed.has(c.data.from ?? "") || doomed.has(c.data.to ?? ""))
              ),
          )
          .map((c) => (c.columnId && doomed.has(c.columnId) ? { ...c, columnId: null } : c)),
      );
      setSelected(new Set());
      setEditing(null);
      try {
        knownRev.current = Math.max(knownRev.current, await deleteCards(target, id, ids));
      } catch (e) {
        setError(friendlyError(e));
        void refresh();
      }
    },
    [id, target, refresh],
  );

  // ---------- geometry ----------

  const maxZ = useMemo(() => cards.reduce((m, c) => Math.max(m, c.z), 0), [cards]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const box = canvasRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - box.left - v.x) / v.zoom, y: (clientY - box.top - v.y) / v.zoom };
  }, []);

  const centre = useCallback(() => {
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    const p = toWorld(box.left + box.width / 2, box.top + box.height / 3);
    return { x: Math.round(p.x / 20) * 20 - 140, y: Math.round(p.y / 20) * 20 - 40 };
  }, [toWorld]);

  // Where every card sits, in board units, for arrows and for dropping into columns.
  const measure = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const origin = world.getBoundingClientRect();
    const zoom = viewRef.current.zoom;
    const next: Record<string, Rect> = {};
    world.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
      const r = el.getBoundingClientRect();
      next[el.dataset.card!] = {
        x: (r.left - origin.left) / zoom,
        y: (r.top - origin.top) / zoom,
        w: r.width / zoom,
        h: r.height / zoom,
      };
    });
    setRects((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, []);

  useLayoutEffect(measure, [cards, view.zoom, measure]);
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const observer = new ResizeObserver(() => measure());
    world.querySelectorAll("[data-card]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [cards, measure]);

  // ---------- adding ----------

  const add = useCallback(
    (kind: CardKind, data?: Partial<CardData>, at?: { x: number; y: number }) => {
      const spot =
        at ??
        freeSpot(Object.values(rects), centre(), {
          w: DEFAULT_WIDTH[kind],
          h: kind === "video" ? 480 : 160,
        });
      const card = blankCard(kind, spot, maxZ + 1);
      if (data) card.data = { ...card.data, ...data };
      cardsRef.current = [...cardsRef.current, card];
      setCards((prev) => [...prev, card]);
      setSelected(new Set([card.id]));
      if (!data && kind !== "image") setEditing(card.id);
      queue([card], true);
      // bring it into view when the free spot is off screen
      const box = canvasRef.current?.getBoundingClientRect();
      const v = viewRef.current;
      if (box && kind !== "arrow") {
        const sx = card.x * v.zoom + v.x;
        const sy = card.y * v.zoom + v.y;
        if (
          sx < START_X ||
          sy < 0 ||
          sx + card.w * v.zoom > box.width ||
          sy + 160 * v.zoom > box.height
        )
          setView({
            ...v,
            x: box.width / 2 - (card.x + card.w / 2) * v.zoom,
            y: box.height / 3 - card.y * v.zoom,
          });
      }
      return card;
    },
    [centre, maxZ, queue, rects],
  );

  const addLink = useCallback(
    (url: string, at?: { x: number; y: number }) => {
      const media = mediaFromUrl(url);
      const card = add(media ? "video" : "link", { url }, at);
      if (media && media.aspect < 1)
        update(card.id, { w: media.provider === "tiktok" ? 325 : 300 });
      if (media && media.aspect >= 1) update(card.id, { w: 420 });
    },
    [add, update],
  );

  const addImages = useCallback(
    async (files: File[], at?: { x: number; y: number }) => {
      const images = files.filter((f) => IMAGE_TYPES.includes(f.type)).slice(0, 10);
      if (images.length === 0) return setError("Use a JPG, PNG, WebP or GIF image.");
      setBusy(true);
      try {
        let n = 0;
        for (const file of images) {
          const { path, ratio } = await uploadImage(target, file);
          add("image", { path, ratio }, at ? { x: at.x + n * 24, y: at.y + n * 24 } : undefined);
          n += 1;
        }
        setError("");
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy(false);
      }
    },
    [target, add],
  );

  const applyTemplate = useCallback(() => {
    const items = campaignTemplate(maxZ + 1);
    setCards((prev) => [...prev, ...items]);
    queue(items, true);
  }, [maxZ, queue]);

  // ---------- pointer: move, pan, resize ----------

  const onCardPointerDown = (e: ReactPointerEvent, card: Card) => {
    if (e.button !== 0) return;
    if (arrowFrom !== undefined) {
      e.stopPropagation();
      e.preventDefault();
      if (arrowFrom === null) return setArrowFrom(card.id);
      if (arrowFrom !== card.id) add("arrow", { from: arrowFrom, to: card.id }, { x: 0, y: 0 });
      setArrowFrom(undefined);
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest(".no-drag, input, textarea, button, a, select, video")) return;
    e.stopPropagation();

    const already = selected.has(card.id);
    const next = e.shiftKey
      ? new Set(already ? [...selected].filter((i) => i !== card.id) : [...selected, card.id])
      : already
        ? selected
        : new Set([card.id]);
    setSelected(next);
    if (editing && editing !== card.id) setEditing(null);
    if (!next.has(card.id)) return;

    const ids = [...next].filter((i) => cardsRef.current.find((c) => c.id === i)?.kind !== "arrow");
    const origin = new Map<string, { x: number; y: number }>();
    const fromColumn = new Map<string, string | null>();
    for (const i of ids) {
      const c = cardsRef.current.find((x) => x.id === i)!;
      const r = rects[i];
      origin.set(i, c.columnId && r ? { x: r.x, y: r.y } : { x: c.x, y: c.y });
      fromColumn.set(i, c.columnId);
    }
    drag.current = {
      type: "move",
      ids,
      start: { x: e.clientX, y: e.clientY },
      origin,
      moved: false,
      fromColumn,
    };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onResizeDown = (e: ReactPointerEvent, card: Card) => {
    e.stopPropagation();
    drag.current = { type: "resize", id: card.id, start: e.clientX, w: card.w };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onCanvasPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (
      (e.target as HTMLElement).closest(
        "[data-card], .board-tools, .board-zoom, .board-empty, .board-hint, button, input",
      )
    )
      return;
    void flush();
    setSelected(new Set());
    setEditing(null);
    if (arrowFrom !== undefined) setArrowFrom(undefined);
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvasRef.current?.setPointerCapture(e.pointerId);
    if (touches.current.size === 2) {
      // two fingers: pinch to zoom
      const [a, b] = [...touches.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      const box = canvasRef.current!.getBoundingClientRect();
      drag.current = {
        type: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2 - box.left, y: (a.y + b.y) / 2 - box.top },
        view,
      };
      return;
    }
    drag.current = { type: "pan", start: { x: e.clientX, y: e.clientY }, view, moved: false };
  };

  const columnUnder = (point: { x: number; y: number }, ids: string[]) =>
    cardsRef.current.find((c) => {
      if (c.kind !== "column" || ids.includes(c.id)) return false;
      const r = rects[c.id];
      return (
        r && point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h + 60
      );
    });

  const onPointerMove = (e: ReactPointerEvent) => {
    if (touches.current.has(e.pointerId))
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d) return;
    if (d.type === "pinch") {
      const [a, b] = [...touches.current.values()];
      if (!a || !b) return;
      const zoom = Math.max(
        0.25,
        Math.min(2, (d.view.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / d.dist),
      );
      setView({
        zoom,
        x: d.mid.x - ((d.mid.x - d.view.x) * zoom) / d.view.zoom,
        y: d.mid.y - ((d.mid.y - d.view.y) * zoom) / d.view.zoom,
      });
      return;
    }
    if (d.type === "pan") {
      const dx = e.clientX - d.start.x;
      const dy = e.clientY - d.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
      setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
      return;
    }
    if (d.type === "resize") {
      const w = Math.max(160, Math.min(1600, d.w + (e.clientX - d.start) / view.zoom));
      setCards((prev) => prev.map((c) => (c.id === d.id ? { ...c, w } : c)));
      return;
    }
    const dx = (e.clientX - d.start.x) / view.zoom;
    const dy = (e.clientY - d.start.y) / view.zoom;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4 / view.zoom) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      setEditing(null);
    }
    setCards((prev) =>
      prev.map((c) => {
        const o = d.origin.get(c.id);
        return o ? { ...c, x: o.x + dx, y: o.y + dy, columnId: null, z: maxZ + 1 } : c;
      }),
    );
    const single =
      d.ids.length === 1 && cardsRef.current.find((c) => c.id === d.ids[0])?.kind !== "column";
    setDropColumn(single ? (columnUnder(toWorld(e.clientX, e.clientY), d.ids)?.id ?? null) : null);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    touches.current.delete(e.pointerId);
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    setDropColumn(null);
    if (!d) return;
    if (d.type === "resize") {
      const c = cardsRef.current.find((x) => x.id === d.id);
      if (c) queue([c], true);
      return;
    }
    if (d.type === "pan" || d.type === "pinch") return;
    if (!d.moved) {
      // a click: put cards that were in a column back where they were
      setCards((prev) =>
        prev.map((c) => (d.fromColumn.get(c.id) ? { ...c, columnId: d.fromColumn.get(c.id)! } : c)),
      );
      return;
    }
    const point = toWorld(e.clientX, e.clientY);
    const column = d.ids.length === 1 ? columnUnder(point, d.ids) : undefined;
    const moved = cardsRef.current
      .filter((c) => d.ids.includes(c.id))
      .map((c) => {
        if (column && c.kind !== "column") {
          const siblings = columnCards(cardsRef.current, column.id).filter((s) => s.id !== c.id);
          const index = siblings.filter((s) => {
            const r = rects[s.id];
            return r && r.y + r.h / 2 < point.y;
          }).length;
          return { ...c, columnId: column.id, position: positionAt(siblings, index) };
        }
        return { ...c, x: Math.round(c.x), y: Math.round(c.y), columnId: null };
      });
    setCards((prev) => prev.map((c) => moved.find((m) => m.id === c.id) ?? c));
    queue(moved, true);
  };

  // Wheel pans; ctrl or cmd with the wheel (and trackpad pinch) zooms around the pointer.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".bc-table-scroll, textarea")) return;
      e.preventDefault();
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const box = el.getBoundingClientRect();
        const zoom = Math.max(0.25, Math.min(2, v.zoom * Math.exp(-e.deltaY / 300)));
        const px = e.clientX - box.left;
        const py = e.clientY - box.top;
        setView({
          zoom,
          x: px - ((px - v.x) * zoom) / v.zoom,
          y: py - ((py - v.y) * zoom) / v.zoom,
        });
      } else setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [page.isSuccess]);

  const zoomBy = (factor: number) => {
    const box = canvasRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    const zoom = Math.max(0.25, Math.min(2, v.zoom * factor));
    const px = box.width / 2;
    const py = box.height / 2;
    setView({ zoom, x: px - ((px - v.x) * zoom) / v.zoom, y: py - ((py - v.y) * zoom) / v.zoom });
  };

  const fit = () => {
    const box = canvasRef.current?.getBoundingClientRect();
    const all = Object.values(rects);
    if (!box || all.length === 0) return setView({ x: START_X, y: 40, zoom: 1 });
    const minX = Math.min(...all.map((r) => r.x));
    const minY = Math.min(...all.map((r) => r.y));
    const maxX = Math.max(...all.map((r) => r.x + r.w));
    const maxY = Math.max(...all.map((r) => r.y + r.h));
    const zoom = Math.max(
      0.25,
      Math.min(1, (box.width - START_X - 40) / (maxX - minX), (box.height - 80) / (maxY - minY)),
    );
    setView({ zoom, x: START_X - minX * zoom, y: 40 - minY * zoom });
  };

  // ---------- keyboard, paste and drop ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const field = (e.target as HTMLElement).closest("input, textarea, [contenteditable=true]");
      if (e.key === "Escape") {
        setEditing(null);
        setArrowFrom(undefined);
        if (!field) setSelected(new Set());
        return;
      }
      if (field) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size > 0) {
        e.preventDefault();
        void remove([...selected]);
      }
      if (e.key === "Enter" && selected.size === 1) {
        e.preventDefault();
        setEditing([...selected][0]!);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).closest?.("input, textarea")) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        void addImages(files);
        return;
      }
      const text = e.clipboardData?.getData("text/plain").trim();
      if (!text) return;
      e.preventDefault();
      if (/^https?:\/\/\S+$/i.test(text)) addLink(text);
      else add("note", { text: text.slice(0, 8000) });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [selected, remove, addImages, addLink, add]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const at = toWorld(e.clientX, e.clientY);
    const files = [...e.dataTransfer.files];
    if (files.length) return void addImages(files, at);
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (/^https?:\/\//i.test(url.trim())) addLink(url.trim(), at);
  };

  // ---------- render ----------

  if (page.isPending) return <p className="muted">Opening the board…</p>;
  if (page.isError)
    return (
      <div className="stack">
        <Notice tone="error">{friendlyError(page.error)}</Notice>
        {boardId && (
          <Button variant="secondary" onClick={() => onOpenBoard(null)}>
            Back to the main board
          </Button>
        )}
      </div>
    );

  const data = page.data as BoardPage;
  const top = cards.filter((c) => c.kind !== "arrow" && !c.columnId).sort((a, b) => a.z - b.z);
  const arrows = cards.filter((c) => c.kind === "arrow");
  const visible = cards.filter((c) => c.kind !== "arrow").length;

  return (
    <div className="cboard">
      <BoardHeader
        page={data}
        target={target}
        onOpenBoard={onOpenBoard}
        onRenamed={(rev) => {
          knownRev.current = Math.max(knownRev.current, rev);
          void refresh();
        }}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div
        ref={canvasRef}
        className={`board-canvas${arrowFrom !== undefined ? " picking" : ""}${dragging ? " is-dragging" : ""}`}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onScroll={(e) => {
          // focusing a field near the edge makes the browser scroll the canvas; panning is ours to do
          e.currentTarget.scrollTop = 0;
          e.currentTarget.scrollLeft = 0;
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundSize: [120, 120, 24, 24]
            .map((n) => `${n * view.zoom}px ${n * view.zoom}px`)
            .join(", "),
        }}
      >
        <div className="board-tools" role="toolbar" aria-label="Add to the board">
          {TOOLS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`tool tool-${kind}`}
              onClick={() => (kind === "image" ? fileRef.current?.click() : add(kind))}
              disabled={busy && kind === "image"}
            >
              <span className="tool-icon" aria-hidden="true" />
              {KIND_LABEL[kind]}
            </button>
          ))}
          <button
            type="button"
            className={`tool tool-arrow${arrowFrom !== undefined ? " on" : ""}`}
            aria-pressed={arrowFrom !== undefined}
            onClick={() => setArrowFrom(arrowFrom === undefined ? null : undefined)}
          >
            <span className="tool-icon" aria-hidden="true" />
            Arrow
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              void addImages([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>

        <div
          ref={worldRef}
          className="board-world"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          <svg className="board-arrows" aria-hidden="true">
            <defs>
              <marker
                id="board-head"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 0 10 5 0 10z" />
              </marker>
            </defs>
            {arrows.map((a) => {
              const from = rects[a.data.from ?? ""];
              const to = rects[a.data.to ?? ""];
              if (!from || !to) return null;
              const p = edgePoint(from, to);
              const q = edgePoint(to, from);
              return (
                <g key={a.id} className={selected.has(a.id) ? "selected" : ""}>
                  <line
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    className="arrow-line"
                    markerEnd="url(#board-head)"
                  />
                  <line
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    className="arrow-hit"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelected(new Set([a.id]));
                    }}
                  />
                </g>
              );
            })}
          </svg>
          <BoardCards
            cards={cards}
            top={top}
            selected={selected}
            editing={editing}
            dropColumn={dropColumn}
            dragging={dragging}
            arrowFrom={arrowFrom ?? null}
            onPointerDown={onCardPointerDown}
            onResizeDown={onResizeDown}
            onData={setData}
            onEdit={(cardId, on) => {
              if (!on) void flush();
              setEditing(on ? cardId : null);
            }}
            onOpen={(card) => {
              void flush();
              if (card.data.boardId) onOpenBoard(card.data.boardId);
            }}
            onRemove={(cardId) => void remove([cardId])}
          />
        </div>

        {visible === 0 && (
          <div className="board-empty">
            <h3>An empty board</h3>
            <p>
              Paste a link to a reel, drop in photos, or add a note from the left.{" "}
              {reader === "team" && !data.board.parentId
                ? "Or start from Gecko's campaign board."
                : ""}
            </p>
            {!data.board.parentId && (
              <Button onClick={applyTemplate}>Start from the campaign board</Button>
            )}
          </div>
        )}

        {arrowFrom !== undefined && (
          <p className="board-hint">
            {arrowFrom === null
              ? "Click the card the arrow starts from."
              : "Now click the card it points to."}
          </p>
        )}

        <div className="board-zoom" aria-label="Zoom">
          <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            onClick={() => setView({ ...view, zoom: 1 })}
            className="zoom-level"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <button type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={fit}>
            Fit
          </button>
        </div>
      </div>
      <p className="small muted board-help">
        Drag empty space to move around, and hold Ctrl or ⌘ while scrolling to zoom. Double-click a
        card to write in it. Paste a link or an image anywhere on the board. Pink tape marks what
        the client added.
      </p>
    </div>
  );
}

function BoardHeader({
  page,
  target,
  onOpenBoard,
  onRenamed,
}: {
  page: BoardPage;
  target: BoardTarget;
  onOpenBoard: (id: string | null) => void;
  onRenamed: (rev: number) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="board-head">
      <nav className="board-path small" aria-label="Boards">
        {page.path.map((p, i) => (
          <span key={p.id}>
            <button
              type="button"
              className="link-btn"
              onClick={() => onOpenBoard(i === 0 ? null : p.id)}
            >
              {p.title || "Board"}
            </button>
            <span aria-hidden="true"> / </span>
          </span>
        ))}
      </nav>
      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const title = String(new FormData(e.currentTarget).get("title") ?? "").trim();
            if (!title) return;
            renameBoard(target, page.board.id, title).then(
              (rev) => {
                setRenaming(false);
                onRenamed(rev);
              },
              (err: unknown) => setError(friendlyError(err)),
            );
          }}
        >
          <input
            name="title"
            className="board-title-input"
            aria-label="Board name"
            defaultValue={page.board.title}
            maxLength={120}
            autoFocus
            onBlur={(e) => e.currentTarget.form?.requestSubmit()}
          />
        </form>
      ) : (
        <h2 className="board-title">
          <button
            type="button"
            className="link-btn"
            onClick={() => setRenaming(true)}
            title="Rename"
          >
            {page.board.title || "Board"}
          </button>
        </h2>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <span className="sr-note small muted">
        Saved as you go. Changes from the other side show within a few seconds.
      </span>
    </div>
  );
}
