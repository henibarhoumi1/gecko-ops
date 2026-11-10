import { useSyncExternalStore } from "react";

/**
 * The sidebar open (the full menu) or folded to a slim strip for more room to work. Remembered on this
 * device, for the team app and the client portal alike.
 */
const KEY = "gecko.sideFolded";
const EVENT = "gecko:side";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setSideFolded(folded: boolean) {
  try {
    localStorage.setItem(KEY, folded ? "1" : "0");
  } catch {
    // Not kept: it still folds for now.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSideFolded(): [boolean, (folded: boolean) => void] {
  const folded = useSyncExternalStore(subscribe, read, () => false);
  return [folded, setSideFolded];
}
