import { describe, expect, it } from "vitest";
import { filterItems, parseTags, tagsInUse, type LibraryItem } from "./library";
import {
  checkState,
  dueOn,
  formatHeadline,
  headlines,
  normaliseResults,
  readMonth,
  waiting,
  type Post,
} from "./model";

const post = (over: Partial<Post> = {}): Post => ({
  id: "p1",
  cutId: null,
  title: "Reel 1",
  platform: "instagram",
  paid: true,
  link: "",
  liveOn: "2026-11-01",
  press: "",
  fromClient: false,
  authorName: "Heni",
  numbers: [],
  ...over,
});

describe("results", () => {
  it("reads at 7 and 30 days after going live, across month ends", () => {
    expect(dueOn("2026-11-01", 7)).toBe("2026-11-08");
    expect(dueOn("2026-11-20", 30)).toBe("2026-12-20");
    expect(dueOn("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("writes the read about the month just ended, until the 10th", () => {
    expect(readMonth("2026-11-02")).toBe("2026-10-01");
    expect(readMonth("2027-01-05")).toBe("2026-12-01");
    expect(readMonth("2026-11-20")).toBe("2026-11-01");
  });

  it("knows what's early, due, waiting to be typed in, and done", () => {
    const today = "2026-11-10";
    expect(checkState(post(), 7, today)).toBe("due");
    expect(checkState(post(), 30, today)).toBe("early");
    const shots = post({
      numbers: [
        {
          day: 7,
          metrics: {},
          shots: ["a.jpg"],
          note: "",
          enteredBy: "",
          enteredAt: null,
          updatedAt: "",
        },
      ],
    });
    expect(checkState(shots, 7, today)).toBe("shots");
    const done = post({
      numbers: [
        {
          day: 7,
          metrics: { impressions: 10 },
          shots: [],
          note: "",
          enteredBy: "Heni",
          enteredAt: null,
          updatedAt: "",
        },
      ],
    });
    expect(checkState(done, 7, today)).toBe("done");
    expect(waiting([post(), shots, done], today)).toEqual({ due: 1, shots: 1 });
  });

  it("works out hook, hold, click-through, cost per purchase and ROAS", () => {
    const rows = headlines(
      "performance",
      {
        spend: 300,
        impressions: 40000,
        views3s: 12000,
        views15s: 3000,
        clicks: 400,
        purchases: 10,
        revenue: 900,
      },
      true,
    );
    const by = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(by.hook).toBeCloseTo(0.3);
    expect(by.hold).toBeCloseTo(0.25);
    expect(by.ctr).toBeCloseTo(0.01);
    expect(by.cpp).toBe(30);
    expect(by.roas).toBe(3);
  });

  it("leaves money out for people who don't see it, and blanks what can't be worked out", () => {
    const rows = headlines("performance", { impressions: 1000 }, false);
    expect(rows.map((r) => r.key)).not.toContain("roas");
    expect(formatHeadline(rows.find((r) => r.key === "hook")!)).toBe("–");
  });

  it("reads cinematic numbers without ad words", () => {
    const rows = headlines("cinematic", { completion: 42, saves: 10, shares: 5 }, true);
    expect(rows.find((r) => r.key === "completion")!.value).toBeCloseTo(0.42);
    expect(rows.find((r) => r.key === "keeps")!.value).toBe(15);
    expect(rows.map((r) => r.key)).not.toContain("ctr");
  });

  it("turns numeric strings from the database into numbers", () => {
    const page = normaliseResults({
      posts: [{ ...post(), numbers: [{ day: 7, metrics: { spend: "120.5" }, shots: [] }] }],
    });
    expect(page.posts[0]!.numbers[0]!.metrics.spend).toBe(120.5);
  });
});

const item = (over: Partial<LibraryItem>): LibraryItem => ({
  id: "i",
  kind: "clip",
  title: "",
  shoot: "",
  shotOn: null,
  tags: [],
  seconds: null,
  thumb: null,
  link: "",
  talentId: null,
  talent: null,
  createdAt: "",
  ...over,
});

describe("library", () => {
  it("tidies typed tags", () => {
    expect(parseTags("Product, hands ,#macro\nproduct")).toEqual(["product", "hands", "macro"]);
  });

  it("lists the base tags first, then the rest by use", () => {
    const items = [
      item({ tags: ["macro", "hands"] }),
      item({ tags: ["macro", "product"] }),
      item({ tags: ["night"] }),
    ];
    expect(tagsInUse(items)).toEqual(["product", "hands", "macro", "night"]);
  });

  it("filters by every chosen tag, shoot and type", () => {
    const items = [
      item({ id: "a", tags: ["product", "hands"], shoot: "S1" }),
      item({ id: "b", tags: ["product"], shoot: "S2", kind: "still" }),
    ];
    expect(filterItems(items, { tags: ["product"], shoot: "", kind: "" }).map((i) => i.id)).toEqual(
      ["a", "b"],
    );
    expect(
      filterItems(items, { tags: ["product", "hands"], shoot: "", kind: "" }).map((i) => i.id),
    ).toEqual(["a"]);
    expect(filterItems(items, { tags: [], shoot: "S2", kind: "still" }).map((i) => i.id)).toEqual([
      "b",
    ]);
  });
});
