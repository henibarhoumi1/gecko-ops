import { describe, expect, it } from "vitest";
import { byMonth, inPeriod, leaders, splitBy, styleOf, totals } from "./board";
import type { Metrics, Post } from "./model";

const post = (id: string, liveOn: string, metrics: Metrics, over: Partial<Post> = {}): Post => ({
  id,
  cutId: null,
  title: id,
  platform: "instagram",
  paid: true,
  link: "",
  liveOn,
  press: "",
  fromClient: false,
  authorName: "Heni",
  numbers: [
    { day: 30, metrics, shots: [], note: "", enteredBy: "", enteredAt: null, updatedAt: "" },
  ],
  ...over,
});

const a = post(
  "a",
  "2026-11-02",
  { spend: 100, impressions: 10000, views3s: 3000, clicks: 100, purchases: 10, revenue: 500 },
  { scriptId: "s1", hookIndex: 0 },
);
const b = post(
  "b",
  "2026-10-10",
  { spend: 300, impressions: 10000, views3s: 1000, clicks: 50, purchases: 5, revenue: 400 },
  { paid: false },
);
const empty = post("c", "2026-11-05", {}, { numbers: [] });
const scripts = [{ id: "s1", title: "S", style: "skit", hook: 0, hooks: ["Still scrubbing?"] }];

describe("results board", () => {
  it("adds up totals and works rates out from the sums", () => {
    const t = totals([a, b, empty]);
    expect(t.posts).toBe(3);
    expect(t.read).toBe(2);
    expect(t.spend).toBe(400);
    expect(t.purchases).toBe(15);
    expect(t.hookRate).toBe(0.2);
    expect(t.costPerPurchase! > 26.66 && t.costPerPurchase! < 26.67).toBe(true);
    expect(t.roas).toBe(2.25);
    expect(t.cpm).toBe(20);
    expect(t.views).toBe(null);
  });
  it("keeps the period and the months", () => {
    expect(inPeriod([a, b], "30", "2026-11-24").map((p) => p.id)).toEqual(["a"]);
    const months = byMonth([a, b], "performance", 3, "2026-11-24");
    expect(months.map((m) => m.month)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(months.map((m) => m.value)).toEqual([0, 5, 10]);
  });
  it("ranks on cost per purchase when money is seen, with the hook that opened it", () => {
    const top = leaders([a, b], { scripts }, "performance", true);
    expect(top.map((r) => r.post.id)).toEqual(["a", "b"]);
    expect(top[0]!.hook).toBe("Still scrubbing?");
    expect(leaders([a, b], { scripts }, "performance", false)[0]!.as).toBe("count");
  });
  it("splits paid and organic and by kind of video", () => {
    expect(
      splitBy([a, b], (p) => (p.paid ? "paid" : "organic"), "performance").map((s) => s.key),
    ).toEqual(["paid", "organic"]);
    expect(splitBy([a, b], styleOf({ scripts }), "performance").map((s) => s.key)).toEqual([
      "skit",
    ]);
  });
});
