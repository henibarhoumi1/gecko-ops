import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/features/workspace/WorkspaceContext";
import { friendlyError } from "@/lib/errors";
import { imageFrom, MEDIA_TYPES, uploadMedia } from "@/lib/media";

/**
 * One picture: drop a file on it, paste one (⌘V) while the pointer is over it or it has focus, paste an image link,
 * or click to choose. Shows the picture once it's there, with Replace and Remove.
 */
export function ImageDrop({
  value,
  onChange,
  label = "Photo",
  hint = "Drop a photo here, paste it (⌘V) or click to choose",
  shape = "wide",
  pasteAnywhere = false,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  shape?: "wide" | "square" | "tall";
  /** In a panel with one picture: an image pasted anywhere in it lands here (text pastes are left alone). */
  pasteAnywhere?: boolean;
}) {
  const { id: workspaceId } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const [hot, setHot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function take(got: { file?: File; url?: string } | null) {
    if (!got) return;
    setError("");
    if (got.url) return onChange(got.url);
    if (!got.file) return;
    setBusy(true);
    try {
      onChange(await uploadMedia(workspaceId, got.file));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  // ⌘V goes to this picture while the pointer is over it or it has focus.
  useEffect(() => {
    if (!hot && !pasteAnywhere) return;
    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return;
      const got = imageFrom(e.clipboardData);
      if (!got) return;
      // A link pasted into a text field stays a link; only picture files are taken from anywhere.
      const t = e.target as HTMLElement | null;
      if (got.url && t && /^(INPUT|TEXTAREA)$/.test(t.tagName) && t !== box.current) return;
      e.preventDefault();
      void take(got);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hot, pasteAnywhere]);

  return (
    <div className="img-drop-field">
      {label && <span className="label">{label}</span>}
      <div
        ref={box}
        tabIndex={0}
        role="button"
        aria-label={value ? `${label}: replace` : `${label}: ${hint}`}
        className={`img-drop img-${shape}${over ? " is-over" : ""}${value ? " has-img" : ""}${busy ? " is-busy" : ""}`}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(document.activeElement === box.current)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(imageFrom(e.dataTransfer));
        }}
      >
        {value ? (
          <img src={value} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="img-drop-hint">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M4 16l4-4 3 3 5-5 4 4M4 5h16v14H4zM8.5 9.5a1 1 0 1 0 0-.01"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{busy ? "Uploading…" : over ? "Drop it here" : hint}</span>
          </span>
        )}
        {value && busy && <span className="img-drop-busy">Uploading…</span>}
      </div>
      {value && (
        <span className="img-drop-acts">
          <button type="button" onClick={() => input.current?.click()}>
            Replace
          </button>
          <button type="button" onClick={() => onChange("")}>
            Remove
          </button>
        </span>
      )}
      {error && <span className="img-drop-err">{error}</span>}
      <input
        ref={input}
        type="file"
        accept={MEDIA_TYPES.join(",")}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void take({ file: f });
          e.target.value = "";
        }}
      />
    </div>
  );
}
