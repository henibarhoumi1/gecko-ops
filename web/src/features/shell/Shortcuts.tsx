import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/** "g" then a letter jumps to a section; "?" shows every key. Ignored while typing in a field. */
const GO: Record<string, [string, string]> = {
  h: ["/today", "Home"],
  o: ["/ceo", "CEO cockpit"],
  k: ["/calendar", "Calendar"],
  p: ["/pipeline", "Pipeline"],
  c: ["/clients", "Clients"],
  s: ["/shoots", "Shoots"],
  t: ["/talent", "Talent"],
  a: ["/alerts", "Alerts"],
};

const typing = (el: Element | null) =>
  !!el &&
  (el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el as HTMLElement).isContentEditable);

export function Shortcuts({ allowed }: { allowed: readonly string[] }) {
  const navigate = useNavigate();
  const [help, setHelp] = useState(false);
  const pending = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(document.activeElement)) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
        return;
      }
      if (e.key === "Escape") setHelp(false);
      if (e.key === "g") {
        pending.current = Date.now();
        return;
      }
      if (Date.now() - pending.current < 1200) {
        pending.current = 0;
        const go = GO[e.key.toLowerCase()];
        if (go && allowed.includes(go[0].slice(1))) {
          e.preventDefault();
          setHelp(false);
          navigate(go[0]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allowed, navigate]);

  if (!help) return null;
  return (
    <div className="palette-veil" onMouseDown={() => setHelp(false)}>
      <div
        className="palette keys-help"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2>Keys</h2>
        <dl>
          <dt>
            <kbd>⌘</kbd> <kbd>K</kbd>
          </dt>
          <dd>Do or find anything</dd>
          <dt>
            <kbd>⌘</kbd> <kbd>S</kbd>
          </dt>
          <dd>Save the script or idea you're writing</dd>
          <dt>
            <kbd>⌘</kbd> <kbd>↵</kbd>
          </dt>
          <dd>Share it with the client</dd>
          <dt>
            <kbd>Alt</kbd> <kbd>1–4</kbd>
          </dt>
          <dd>Switch section while writing</dd>
          {Object.entries(GO)
            .filter(([, [path]]) => allowed.includes(path.slice(1)))
            .map(([key, [, label]]) => (
              <div key={key} className="keys-row">
                <dt>
                  <kbd>G</kbd> <kbd>{key.toUpperCase()}</kbd>
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          <dt>
            <kbd>?</kbd>
          </dt>
          <dd>This list</dd>
        </dl>
      </div>
    </div>
  );
}
