import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Writing is kept on this device while you type, so closing the tab or the laptop doesn't lose it. The kept
 * copy comes back the next time the same form opens, and goes away once it's saved (or after two weeks).
 */
const PREFIX = "gecko.draft.";
const MAX_AGE = 14 * 24 * 3600 * 1000;

interface Stored<T> {
  at: number;
  value: T;
}

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored<T>;
    if (!s || typeof s.at !== "number" || Date.now() - s.at > MAX_AGE) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return s.value;
  } catch {
    return null;
  }
}

export function writeDraft<T>(key: string, value: T) {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ at: Date.now(), value } satisfies Stored<T>),
    );
  } catch {
    // Full or private mode: the form still works, it just isn't kept.
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing kept.
  }
}

/** Asks before closing the tab while there's writing that isn't saved. */
export function useLeaveWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/**
 * State that keeps itself on this device: starts from the kept copy when there is one (restored = true),
 * and keeps every change. Call clear() once saved.
 */
export function useDraft<T>(key: string, initial: () => T) {
  const [state, setState] = useState(() => {
    const kept = readDraft<T>(key);
    return { value: kept ?? initial(), restored: kept !== null, dirty: kept !== null };
  });
  const setValue = useCallback(
    (next: T | ((prev: T) => T)) =>
      setState((s) => {
        const value = typeof next === "function" ? (next as (prev: T) => T)(s.value) : next;
        writeDraft(key, value);
        return { ...s, value, dirty: true };
      }),
    [key],
  );
  const clear = useCallback(() => {
    clearDraft(key);
    setState((s) => ({ ...s, dirty: false, restored: false }));
  }, [key]);
  const discard = useCallback(() => {
    clearDraft(key);
    setState({ value: initial(), restored: false, dirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useLeaveWarning(state.dirty);
  return { value: state.value, setValue, restored: state.restored, clear, discard };
}

/**
 * The same for a form whose fields keep their own values: fills the named fields from the kept copy when
 * the form opens, and keeps them as you type.
 */
export function useFormDraft(form: RefObject<HTMLFormElement | null>, key: string) {
  const [restored, setRestored] = useState(false);
  const [dirty, setDirty] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    const el = form.current;
    if (!el) return;
    if (first.current) {
      first.current = false;
      const kept = readDraft<Record<string, string>>(key);
      if (kept) {
        for (const [name, value] of Object.entries(kept)) {
          const field = el.elements.namedItem(name);
          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
          ) {
            if (
              field instanceof HTMLInputElement &&
              (field.type === "checkbox" || field.type === "radio")
            )
              continue;
            field.value = value;
          }
        }
        setRestored(true);
        setDirty(true);
      }
    }
    const keep = () => {
      const data: Record<string, string> = {};
      new FormData(el).forEach((v, k) => {
        if (typeof v === "string") data[k] = v;
      });
      writeDraft(key, data);
      setDirty(true);
    };
    el.addEventListener("input", keep);
    el.addEventListener("change", keep);
    return () => {
      el.removeEventListener("input", keep);
      el.removeEventListener("change", keep);
    };
  }, [form, key]);

  useLeaveWarning(dirty);
  return {
    restored,
    clear: () => {
      clearDraft(key);
      setDirty(false);
      setRestored(false);
    },
    discard: () => {
      clearDraft(key);
      setDirty(false);
      setRestored(false);
      form.current?.reset();
    },
  };
}
