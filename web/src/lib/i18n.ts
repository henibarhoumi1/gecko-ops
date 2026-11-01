import { useSyncExternalStore } from "react";

/**
 * English and French for everything a client sees. Copy sits next to the code that uses it, as a pair:
 * t("Approve", "Approuver"). The choice is remembered in this browser; the first visit follows the browser's
 * language.
 */
export type Lang = "en" | "fr";

const KEY = "gecko.lang";
const listeners = new Set<() => void>();

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "fr") return saved;
  } catch {
    // storage blocked: fall through to the browser language
  }
  if (typeof navigator !== "undefined" && /^fr\b/i.test(navigator.language ?? "")) return "fr";
  return "en";
}

let current: Lang = initial();
if (typeof document !== "undefined") document.documentElement.lang = current;

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // not remembered, still switched
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

let team = false;

/** Inside the team app everything stays English, whatever the switch says. */
export function setTeamMode(on: boolean) {
  team = on;
}

function active(): Lang {
  return team ? "en" : current;
}

/** The English or French version, for the language in use. */
export function t(en: string, fr: string): string {
  return active() === "fr" ? fr : en;
}

/** A count with the right word: plural(3, ["reel", "reels"], ["vidéo", "vidéos"]). French uses the singular for 0 and 1. */
export function plural(count: number, en: [string, string], fr: [string, string]): string {
  if (active() === "fr") return `${count} ${count <= 1 ? fr[0] : fr[1]}`;
  return `${count} ${count === 1 ? en[0] : en[1]}`;
}

/** Dates in the language in use. */
export function locale(): string {
  return active() === "fr" ? "fr-FR" : "en-GB";
}
