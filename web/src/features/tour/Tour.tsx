import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { t } from "@/lib/i18n";
import { placeCard, type Box, type TourStep } from "./steps";

const EVENT = "gecko:tour";

/** Opens the tour from anywhere (a "Take the tour" button). */
export function startTour() {
  window.dispatchEvent(new Event(EVENT));
}

function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function markSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Not kept: it may show again next time.
  }
}

/**
 * A short guided tour: dims the page, rings the thing it talks about, and walks through it with Next.
 * Opens by itself the first time on a device (not for automated browsers), and from startTour().
 */
export function Tour({ steps, storageKey }: { steps: TourStep[]; storageKey: string }) {
  const [at, setAt] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = () => setAt(0);
    window.addEventListener(EVENT, open);
    let timer = 0;
    if (!seen(storageKey) && !navigator.webdriver) timer = window.setTimeout(open, 1200);
    return () => {
      window.removeEventListener(EVENT, open);
      window.clearTimeout(timer);
    };
  }, [storageKey]);

  const close = useCallback(() => {
    markSeen(storageKey);
    setAt(null);
  }, [storageKey]);

  const step = at === null ? null : steps[at];

  // Find the target, scroll it into view and measure it, again on resize.
  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      const r = el?.getBoundingClientRect();
      const visible = r && r.width > 0 && r.height > 0;
      const b = visible ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      setBox(b);
      const c = card.current?.getBoundingClientRect();
      setPos(
        placeCard(
          b,
          { width: c?.width ?? 320, height: c?.height ?? 180 },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    };
    const el = step.target ? document.querySelector(step.target) : null;
    el?.scrollIntoView({ block: "nearest" });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);

  useEffect(() => {
    if (at === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setAt((n) => (n !== null && n < steps.length - 1 ? n + 1 : n));
      if (e.key === "ArrowLeft") setAt((n) => (n ? n - 1 : n));
    };
    window.addEventListener("keydown", onKey);
    card.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [at, close, steps.length]);

  if (at === null || !step) return null;
  const last = at === steps.length - 1;
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {box ? (
        <div
          className="tour-ring"
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
          }}
        />
      ) : (
        <div className="tour-dim" onClick={close} />
      )}
      <div
        ref={card}
        className="tour-card"
        tabIndex={-1}
        style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
      >
        <p className="small tour-count">
          {at + 1} / {steps.length}
        </p>
        <h2 id="tour-title">[ {step.title} ]</h2>
        <p>{step.text}</p>
        <div className="tour-actions">
          <Button variant="link" onClick={close}>
            {t("Skip", "Passer")}
          </Button>
          {at > 0 && (
            <Button variant="secondary" className="btn-small" onClick={() => setAt(at - 1)}>
              {t("Back", "Retour")}
            </Button>
          )}
          <Button className="btn-small" onClick={() => (last ? close() : setAt(at + 1))}>
            {last ? t("Done", "Terminé") : t("Next", "Suivant")}
          </Button>
        </div>
      </div>
    </div>
  );
}
