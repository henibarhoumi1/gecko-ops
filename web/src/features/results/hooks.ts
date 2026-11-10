import type { Template } from "@/lib/wording";
import type { Post, ResultsPage } from "./model";

/** A hook that went live, with how well it held people. */
export interface ProvenHook {
  text: string;
  scriptId: string;
  scriptTitle: string;
  postId: string;
  postTitle: string;
  /** Performance: 3-second views ÷ impressions. Cinematic: share watched to the end (0 to 1). */
  score: number;
  day: 7 | 30;
}

function bestNumbers(post: Post) {
  const done = post.numbers.filter((n) => Object.keys(n.metrics).length > 0);
  return done.find((n) => n.day === 30) ?? done.find((n) => n.day === 7) ?? null;
}

/**
 * The hooks that went live for this client, best first: each post that says which script it came
 * from, scored on the number that judges an opening. One line per hook, at its best post.
 */
export function provenHooks(
  page: Pick<ResultsPage, "posts" | "scripts">,
  template: Template,
): ProvenHook[] {
  const best = new Map<string, ProvenHook>();
  for (const post of page.posts) {
    if (!post.scriptId) continue;
    const script = page.scripts.find((s) => s.id === post.scriptId);
    const numbers = bestNumbers(post);
    if (!script || !numbers) continue;
    const text = script.hooks[post.hookIndex ?? script.hook ?? 0]?.trim();
    if (!text) continue;
    const m = numbers.metrics;
    const score =
      template === "cinematic"
        ? m.completion == null
          ? null
          : m.completion / 100
        : m.views3s == null || !m.impressions
          ? null
          : m.views3s / m.impressions;
    if (score == null) continue;
    const key = text.toLowerCase();
    const prev = best.get(key);
    if (!prev || score > prev.score)
      best.set(key, {
        text,
        scriptId: script.id,
        scriptTitle: script.title,
        postId: post.id,
        postTitle: post.title,
        score,
        day: numbers.day,
      });
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

/** Hooks worth writing again: the top ones, and only those that did at least as well as the middle. */
export function hooksToReuse(list: readonly ProvenHook[], max = 5): ProvenHook[] {
  if (list.length === 0) return [];
  const middle = [...list].sort((a, b) => a.score - b.score)[Math.ceil((list.length - 1) / 2)]!
    .score;
  return list.filter((h) => h.score >= middle).slice(0, max);
}
