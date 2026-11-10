import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the element named in the address (#script-…, #idea-…) once the page has its data, and
 * marks it for a moment so the eye finds it.
 */
export function useHashScroll(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || hash.length < 2) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    // A folded group (approved, older) opens so the item can be seen.
    for (let p = el.parentElement; p; p = p.parentElement)
      if (p instanceof HTMLDetailsElement) p.open = true;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
    el.classList.add("flash");
    const timer = window.setTimeout(() => el.classList.remove("flash"), 2000);
    return () => window.clearTimeout(timer);
  }, [hash, ready]);
}
