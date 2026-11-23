import { useEffect, useState, type CSSProperties } from "react";

/**
 * Feedback for every action, bottom right: "Approved · Dany Clean was told · Undo". A toast can celebrate (a
 * small burst in the site's pink, yellow and blue) when something gets approved or shared. Call toast() from
 * anywhere; <Toaster /> is mounted once in the shell.
 */
export interface ToastInput {
  text: string;
  /** A second, quieter line. */
  detail?: string;
  undo?: () => void | Promise<unknown>;
  celebrate?: boolean;
  tone?: "plain" | "error";
}

interface Shown extends ToastInput {
  id: number;
}

const EVENT = "gecko:toast";
let next = 1;

export function toast(input: ToastInput) {
  window.dispatchEvent(new CustomEvent<Shown>(EVENT, { detail: { ...input, id: next++ } }));
}

const COLORS = ["#f4c1c4", "#f3df9e", "#b8d4f5", "#000000"];

function Burst() {
  // 18 pieces fly out from the toast's corner; pure CSS, removed with the toast.
  return (
    <span className="toast-burst" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 60 + (i % 3) * 26;
        return (
          <i
            key={i}
            style={
              {
                "--x": `${Math.cos(angle) * dist}px`,
                "--y": `${Math.sin(angle) * dist - 30}px`,
                "--r": `${(i * 47) % 360}deg`,
                background: COLORS[i % COLORS.length],
                animationDelay: `${(i % 4) * 25}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
}

export function Toaster() {
  const [items, setItems] = useState<Shown[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const t = (e as CustomEvent<Shown>).detail;
      setItems((list) => [...list.slice(-2), t]);
      window.setTimeout(
        () => setItems((list) => list.filter((x) => x.id !== t.id)),
        t.undo ? 7000 : 4200,
      );
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  const close = (id: number) => setItems((list) => list.filter((x) => x.id !== id));

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast${t.tone === "error" ? " is-error" : ""}`}>
          {t.celebrate && <Burst />}
          <span className="toast-mark" aria-hidden="true">
            {t.tone === "error" ? "!" : "✓"}
          </span>
          <span className="toast-text">
            <strong>{t.text}</strong>
            {t.detail && <span className="small">{t.detail}</span>}
          </span>
          {t.undo && (
            <button
              type="button"
              className="toast-undo"
              onClick={() => {
                close(t.id);
                void Promise.resolve(t.undo?.()).then(
                  () => toast({ text: "Undone" }),
                  () => toast({ text: "Couldn't undo", tone: "error" }),
                );
              }}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            className="toast-close"
            aria-label="Close"
            onClick={() => close(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
