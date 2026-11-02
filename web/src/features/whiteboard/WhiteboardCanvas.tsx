import { useCallback, useEffect, useRef, useState } from "react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  Excalidraw,
  getSceneVersion,
  reconcileElements,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type {
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import { Notice } from "@/components/Notice";
import { mediaFromUrl } from "@/features/board/embed";
import { friendlyError } from "@/lib/errors";
import { getLang, t } from "@/lib/i18n";
import { starterSkeleton, NOTE_COLORS, noteSkeleton } from "./starter";
import {
  downloadBoardFile,
  getWhiteboard,
  saveWhiteboard,
  uploadBoardFile,
  whiteboardRev,
  type FileMap,
  type WhiteboardTarget,
} from "./whiteboardApi";

// Excalidraw's fonts are served with the app, so the board never calls a font CDN.
(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH =
  `${window.location.origin}/excalidraw/`;

const SAVE_AFTER_MS = 900;
const POLL_MS = 3000;
const KEPT_IMAGES: string[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Status = "loading" | "saved" | "saving" | "error";

/** A real whiteboard on white: pen, shapes, notes, images, frames and playable video links, shared live. */
export default function WhiteboardCanvas({
  target,
  boardId,
  template,
}: {
  target: WhiteboardTarget;
  boardId: string;
  template: "performance" | "cinematic";
}) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initial, setInitial] = useState<{ elements: OrderedExcalidrawElement[] } | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const rev = useRef(0);
  const savedVersion = useRef(-1);
  const fileMap = useRef<FileMap>({});
  const saving = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const loadedFiles = useRef(new Set<string>());

  // First load: the stored drawing, or a starter layout for this kind of client.
  useEffect(() => {
    let live = true;
    getWhiteboard(target, boardId).then(
      (board) => {
        if (!live) return;
        rev.current = board.rev;
        fileMap.current = board.files ?? {};
        const stored = board.elements as OrderedExcalidrawElement[];
        const elements = stored.length
          ? stored
          : (convertToExcalidrawElements(starterSkeleton(template)) as OrderedExcalidrawElement[]);
        if (!stored.length) dirty.current = true;
        savedVersion.current = stored.length ? getSceneVersion(stored) : -1;
        setInitial({ elements });
        setStatus("saved");
      },
      (e: unknown) => live && (setError(friendlyError(e)), setStatus("error")),
    );
    return () => {
      live = false;
    };
  }, [target, boardId, template]);

  /** Fetches any stored images the canvas doesn't hold yet. */
  const loadFiles = useCallback(async (excalidraw: ExcalidrawImperativeAPI, map: FileMap) => {
    const missing = Object.entries(map).filter(([id]) => !loadedFiles.current.has(id));
    if (!missing.length) return;
    const files: BinaryFileData[] = [];
    for (const [id, file] of missing) {
      try {
        files.push({
          id: id as BinaryFileData["id"],
          dataURL: (await downloadBoardFile(file.path)) as BinaryFileData["dataURL"],
          mimeType: file.mimeType as BinaryFileData["mimeType"],
          created: Date.now(),
        });
        loadedFiles.current.add(id);
      } catch {
        // A missing image shows as a blank frame; the rest of the board still works.
      }
    }
    if (files.length) excalidraw.addFiles(files);
  }, []);

  useEffect(() => {
    if (!api) return;
    void loadFiles(api, fileMap.current);
    // Open on the whole board, not a corner of it.
    const id = window.setTimeout(
      () =>
        api.scrollToContent(undefined, {
          fitToViewport: true,
          viewportZoomFactor: 0.9,
          maxZoom: 1,
        }),
      50,
    );
    return () => window.clearTimeout(id);
  }, [api, loadFiles]);

  /** Pulls someone else's changes into the canvas without touching what this person is doing. */
  const pull = useCallback(async () => {
    if (!api) return;
    const board = await getWhiteboard(target, boardId);
    const merged = reconcileElements(
      api.getSceneElementsIncludingDeleted(),
      board.elements as RemoteExcalidrawElement[],
      api.getAppState(),
    );
    api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
    rev.current = board.rev;
    fileMap.current = { ...fileMap.current, ...board.files };
    savedVersion.current = getSceneVersion(merged);
    await loadFiles(api, board.files ?? {});
  }, [api, target, boardId, loadFiles]);

  const save = useCallback(async () => {
    if (!api || saving.current) return;
    saving.current = true;
    dirty.current = false;
    setStatus("saving");
    try {
      // Upload images first, so the saved drawing never points at a file that isn't there.
      const files = api.getFiles();
      const added: FileMap = {};
      for (const [id, file] of Object.entries(files)) {
        // The bucket keeps photos only; anything else stays on this screen and is not shared.
        if (fileMap.current[id] || !file.dataURL || !KEPT_IMAGES.includes(file.mimeType)) continue;
        added[id] = {
          path: await uploadBoardFile(target, id, file.dataURL, file.mimeType),
          mimeType: file.mimeType,
        };
        loadedFiles.current.add(id);
      }
      const elements = api.getSceneElementsIncludingDeleted();
      const version = getSceneVersion(elements);
      const before = rev.current;
      const next = await saveWhiteboard(target, boardId, elements, added);
      fileMap.current = { ...fileMap.current, ...added };
      savedVersion.current = version;
      rev.current = next;
      // Someone else saved in between: bring their changes in too.
      if (next !== before + 1) await pull();
      setStatus(dirty.current ? "saving" : "saved");
      setError("");
    } catch (e) {
      setError(friendlyError(e));
      setStatus("error");
      dirty.current = true;
    } finally {
      saving.current = false;
      if (dirty.current) timer.current = window.setTimeout(() => void save(), SAVE_AFTER_MS);
    }
  }, [api, target, boardId, pull]);

  // A starter layout is saved straight away, so the other side sees the same frames.
  useEffect(() => {
    if (api && dirty.current && status === "saved") void save();
  }, [api, save, status]);

  const onChange = useCallback(
    (elements: readonly OrderedExcalidrawElement[], _state: AppState, files: BinaryFiles) => {
      if (!api) return;
      const version = getSceneVersion(elements);
      const newFile = Object.entries(files).some(
        ([id, f]) => !fileMap.current[id] && KEPT_IMAGES.includes(f.mimeType),
      );
      if (version === savedVersion.current && !newFile) return;
      dirty.current = true;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void save(), SAVE_AFTER_MS);
    },
    [api, save],
  );

  // Every few seconds, check whether the other side drew something.
  useEffect(() => {
    if (!api) return;
    const id = window.setInterval(() => {
      if (saving.current || dirty.current || document.hidden) return;
      whiteboardRev(target, boardId)
        .then((r) => (r > rev.current ? pull() : undefined))
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [api, target, boardId, pull]);

  // Save on the way out.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (dirty.current) void save();
    },
    [save],
  );

  function addNote(color: string) {
    if (!api) return;
    const s = api.getAppState();
    const x = -s.scrollX + s.width / 2 / s.zoom.value - 110 + Math.random() * 40;
    const y = -s.scrollY + s.height / 2 / s.zoom.value - 80 + Math.random() * 40;
    const note = convertToExcalidrawElements(noteSkeleton(x, y, color));
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...note],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }

  if (status === "error" && !initial) return <Notice tone="error">{error}</Notice>;
  if (!initial) return <p className="muted">{t("Opening the board…", "Ouverture du tableau…")}</p>;

  return (
    <div className="whiteboard">
      <div className="whiteboard-canvas">
        <Excalidraw
          excalidrawAPI={setApi}
          initialData={{
            elements: initial.elements,
            appState: {
              viewBackgroundColor: "#ffffff",
              currentItemRoughness: 0,
              currentItemFontFamily: 2,
              currentItemStrokeColor: "#000000",
              currentItemStrokeWidth: 1,
            },
          }}
          onChange={onChange}
          langCode={getLang() === "fr" ? "fr-FR" : "en"}
          theme="light"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              toggleTheme: false,
              loadScene: false,
              saveToActiveFile: false,
              clearCanvas: false,
              export: false,
              saveAsImage: true,
            },
          }}
          validateEmbeddable={(link) => Boolean(mediaFromUrl(link))}
          renderEmbeddable={(element) => <Embed link={element.link ?? ""} />}
        />
      </div>
      <div className="wb-foot">
        <div className="wb-notes" role="group" aria-label={t("Add a note", "Ajouter un post-it")}>
          <span className="small">{t("Add a note", "Ajouter un post-it")}</span>
          {NOTE_COLORS.map(([name, color]) => (
            <button
              key={color}
              type="button"
              className="wb-note"
              style={{ background: color }}
              title={t(`Add a ${name.en} note`, `Ajouter un post-it ${name.fr}`)}
              aria-label={t(`Add a ${name.en} note`, `Ajouter un post-it ${name.fr}`)}
              onClick={() => addNote(color)}
            />
          ))}
        </div>
        <p className="small muted wb-status" aria-live="polite">
          {status === "saving"
            ? t("Saving…", "Enregistrement…")
            : status === "error"
              ? error
              : t(
                  "Saved. Paste an Instagram, TikTok, YouTube or Vimeo link to play it on the board.",
                  "Enregistré. Collez un lien Instagram, TikTok, YouTube ou Vimeo pour le lire sur le tableau.",
                )}
        </p>
      </div>
    </div>
  );
}

function Embed({ link }: { link: string }) {
  const media = mediaFromUrl(link);
  if (!media) return null;
  if (media.provider === "file")
    return <video className="wb-embed" src={media.src} controls playsInline />;
  return (
    <iframe
      src={media.src}
      title={media.label}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="wb-embed"
    />
  );
}

export type { NonDeletedExcalidrawElement };
