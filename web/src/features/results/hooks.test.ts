import { describe, expect, it } from "vitest";
import { hooksToReuse, provenHooks } from "./hooks";
import type { Post, ResultScript } from "./model";

const script: ResultScript = {
  id: "s1",
  title: "Stain script",
  style: "problem-fix",
  hook: 0,
  hooks: ["Stop scrubbing", "3 seconds, no stain"],
};

const post = (
  id: string,
  patch: Partial<Post>,
  metrics: Post["numbers"][number]["metrics"],
  day: 7 | 30 = 7,
): Post => ({
  id,
  cutId: null,
  title: `Post ${id}`,
  platform: "instagram",
  paid: true,
  link: "",
  liveOn: "2026-11-01",
  press: "",
  fromClient: false,
  authorName: "",
  scriptId: "s1",
  hookIndex: null,
  numbers: [{ day, metrics, shots: [], note: "", enteredBy: "", enteredAt: null, updatedAt: "" }],
  ...patch,
});

describe("hooks that worked", () => {
  it("scores each hook on its best post, best first", () => {
    const list = provenHooks(
      {
        scripts: [script],
        posts: [
          post("a", {}, { impressions: 1000, views3s: 250 }),
          post("b", { hookIndex: 1 }, { impressions: 1000, views3s: 400 }),
          post("c", {}, { impressions: 1000, views3s: 300 }, 30),
          post("d", { scriptId: null }, { impressions: 10, views3s: 9 }),
          post("e", { hookIndex: 1 }, { impressions: 0, views3s: 0 }),
        ],
      },
      "performance",
    );
    expect(list.map((h) => [h.text, h.score, h.postId])).toEqual([
      ["3 seconds, no stain", 0.4, "b"],
      ["Stop scrubbing", 0.3, "c"],
    ]);
  });

  it("scores films on how many watched to the end", () => {
    const list = provenHooks(
      { scripts: [script], posts: [post("a", {}, { completion: 42 })] },
      "cinematic",
    );
    expect(list[0]!.score).toBe(0.42);
  });

  it("keeps the ones at or above the middle", () => {
    const h = (score: number) => ({
      text: String(score),
      scriptId: "",
      scriptTitle: "",
      postId: "",
      postTitle: "",
      score,
      day: 7 as const,
    });
    expect(hooksToReuse([h(0.5), h(0.4), h(0.3), h(0.1)]).map((x) => x.score)).toEqual([0.5, 0.4]);
    expect(hooksToReuse([])).toEqual([]);
  });
});
