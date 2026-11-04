import { describe, expect, it } from "vitest";
import {
  byClient,
  daysSince,
  hasCreative,
  headline,
  linkFor,
  splitDates,
  waited,
  when,
  type ClientItem,
  type DateItem,
} from "./model";

const item = (p: Partial<ClientItem>): ClientItem => ({
  client_id: "dany",
  brand: "Dany Clean",
  part: "script",
  id: "1",
  title: "T",
  at: "2026-11-02T10:00:00Z",
  due: null,
  ...p,
});

describe("today model", () => {
  it("counts whole days of waiting", () => {
    const now = new Date("2026-11-04T09:00:00Z");
    expect(daysSince("2026-11-04T08:00:00Z", now)).toBe(0);
    expect(daysSince("2026-11-02T10:00:00Z", now)).toBe(1);
    expect(waited(0)).toBe("today");
    expect(waited(1)).toBe("1 day");
    expect(waited(5)).toBe("5 days");
  });

  it("says dates in plain words", () => {
    expect(when("2026-11-04", "2026-11-04")).toBe("Today");
    expect(when("2026-11-05", "2026-11-04")).toBe("Tomorrow");
    expect(when("2026-11-19", "2026-11-04")).toBe("In 15 days");
    expect(when("2026-11-01", "2026-11-04")).toBe("3 days ago");
  });

  it("links each item to its tab", () => {
    expect(linkFor({ client_id: "dany", part: "cut", id: "x" })).toBe("/clients/dany/review");
    expect(linkFor({ client_id: "dany", part: "invoice", id: "inv" })).toBe("/clients/dany/money/inv");
    expect(linkFor({ client_id: "rare rich", part: "concept", id: "x" })).toBe(
      "/clients/rare%20rich/concepts",
    );
  });

  it("groups what waits on clients, longest wait first, with nudge counts", () => {
    const groups = byClient([
      item({ client_id: "rare", brand: "RareRich", part: "concept", at: "2026-11-03T10:00:00Z" }),
      item({ part: "script", at: "2026-11-01T10:00:00Z" }),
      item({ part: "cut", id: "2" }),
      item({ part: "invoice", id: "3" }),
    ]);
    expect(groups.map((g) => g.brand)).toEqual(["Dany Clean", "RareRich"]);
    expect(groups[0]!.waiting).toEqual({ ideas: 0, scripts: 1, cuts: 1, options: 0 });
    expect(hasCreative(groups[0]!.waiting)).toBe(true);
    expect(hasCreative(byClient([item({ part: "invoice" })])[0]!.waiting)).toBe(false);
  });

  it("keeps slipped dates apart, but never calls a past shoot late", () => {
    const d = (kind: DateItem["kind"], date: string): DateItem => ({
      client_id: "dany",
      brand: "Dany Clean",
      kind,
      label: kind,
      date,
    });
    const { late, coming } = splitDates(
      [d("milestone", "2026-11-02"), d("shoot", "2026-11-01"), d("drafts", "2026-11-08")],
      "2026-11-04",
    );
    expect(late.map((x) => x.kind)).toEqual(["milestone"]);
    expect(coming.map((x) => x.kind)).toEqual(["drafts"]);
  });

  it("sums the day up in one line", () => {
    expect(headline({ us: [], client: [], dates: [], today: "2026-11-04" })).toBe(
      "Nothing waiting. A clear day.",
    );
    expect(
      headline({
        us: [{} as never],
        client: [{} as never, {} as never],
        dates: [{ date: "2026-11-04" } as never],
        today: "2026-11-04",
      }),
    ).toBe("1 thing waiting on you · 2 waiting on clients · 1 due today.");
  });
});
