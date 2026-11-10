import {
  dueLeads,
  groupUs,
  nextShoot,
  parseCapture,
  summarise,
  weekStrip,
  type DateItem,
  type ShootDate,
  type UsItem,
} from "./model";

const us = (over: Partial<UsItem>): UsItem => ({
  client_id: "dc",
  brand: "Dany Clean",
  part: "concept",
  id: "x",
  title: "T",
  why: "idea",
  at: "2026-11-08T10:00:00Z",
  body: null,
  ...over,
});

const shoot = (over: Partial<ShootDate>): ShootDate => ({
  id: "s1",
  clientId: "rr",
  brand: "RareRich",
  day: "2026-11-12",
  title: "Day 1",
  callTime: "08:30",
  reels: 8,
  done: 0,
  ...over,
});

describe("Today, one line per client", () => {
  it("counts items by kind, biggest first", () => {
    expect(
      summarise([
        { part: "concept" },
        { part: "script" },
        { part: "concept" },
        { part: "concept" },
      ]),
    ).toBe("3 ideas, 1 script");
    expect(summarise([{ part: "production" }])).toBe("1 shoot option");
  });

  it("groups what waits on you by client, the longest wait first", () => {
    const groups = groupUs([
      us({ id: "a", at: "2026-11-09T10:00:00Z" }),
      us({ id: "b", client_id: "rr", brand: "RareRich", at: "2026-11-01T10:00:00Z" }),
      us({ id: "c", at: "2026-11-05T10:00:00Z" }),
    ]);
    expect(groups.map((g) => [g.brand, g.items.length, g.oldest])).toEqual([
      ["RareRich", 1, "2026-11-01T10:00:00Z"],
      ["Dany Clean", 2, "2026-11-05T10:00:00Z"],
    ]);
  });
});

describe("the week strip", () => {
  const dates: DateItem[] = [
    { client_id: "rr", brand: "RareRich", kind: "shoot", label: "Shoot", date: "2026-11-12" },
    {
      client_id: "dc",
      brand: "Dany Clean",
      kind: "drafts",
      label: "First drafts due",
      date: "2026-11-16",
    },
    { client_id: null, brand: "Hera Labs", kind: "lead", label: "Follow up", date: "2026-11-30" },
  ];

  it("shows seven days with their entries, a shoot day page replacing the Overview's shoot date", () => {
    const week = weekStrip("2026-11-10", dates, [shoot({})]);
    expect(week.map((d) => d.date)).toEqual([
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
    ]);
    expect(week[2]!.entries).toEqual([
      {
        kind: "shoot",
        brand: "RareRich",
        label: "Day 1 · call 08:30 · 0/8 shot",
        to: "/shoots/rr/s1",
      },
    ]);
    expect(week[6]!.entries.map((e) => e.label)).toEqual(["First drafts due"]);
    expect(week.flatMap((d) => d.entries)).toHaveLength(2);
  });

  it("keeps the Overview's shoot date when there's no shoot day page for it", () => {
    expect(weekStrip("2026-11-10", dates, [])[2]!.entries[0]!.to).toBe("/clients/rr");
  });

  it("finds the next shoot from today on", () => {
    const list = [
      shoot({ id: "past", day: "2026-11-09" }),
      shoot({ id: "late", day: "2026-11-12", callTime: "14:00" }),
      shoot({ id: "early", day: "2026-11-12", callTime: "08:00" }),
    ];
    expect(nextShoot(list, "2026-11-10")?.id).toBe("early");
    expect(nextShoot([], "2026-11-10")).toBeNull();
  });
});

describe("leads and quick capture", () => {
  it("lists open leads due today or late, the latest first", () => {
    const leads = [
      { brand: "B", stage: "contacted", next_date: "2026-11-10" },
      { brand: "A", stage: "prospect", next_date: "2026-11-02" },
      { brand: "C", stage: "prospect", next_date: "2026-11-11" },
      { brand: "D", stage: "won", next_date: "2026-11-01" },
      { brand: "E", stage: "prospect", next_date: null },
    ];
    expect(dueLeads(leads, "2026-11-10").map((l) => l.brand)).toEqual(["A", "B", "E"]);
  });

  it("reads 'idea <client>: …' and 'lead …'", () => {
    const clients = [
      { id: "dc", brand: "Dany Clean" },
      { id: "rr", brand: "RareRich" },
    ];
    expect(
      parseCapture("idea dany: Mother-in-law inspects the house. She finds nothing.", clients),
    ).toEqual({
      kind: "idea",
      clientId: "dc",
      title: "Mother-in-law inspects the house.",
      body: "She finds nothing.",
    });
    expect(parseCapture("lead @crush__cookies", clients)).toEqual({
      kind: "lead",
      text: "@crush__cookies",
    });
    expect(parseCapture("A thrift hunt with Farah", clients)).toEqual({
      kind: "idea",
      clientId: null,
      title: "A thrift hunt with Farah",
      body: "",
    });
    expect(parseCapture("   ", clients)).toBeNull();
  });
});
