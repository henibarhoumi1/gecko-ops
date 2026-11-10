import {
  callSheet,
  changeLine,
  mapHref,
  nextReel,
  normaliseShootPage,
  progress,
  readerLines,
  readSeconds,
  relativeDay,
  splitDays,
  toggleLine,
  whatsappTo,
  type ShootDay,
  type ShootReel,
} from "./model";

const reel = (over: Partial<ShootReel> = {}): ShootReel => ({
  id: "r1",
  scriptId: "s1",
  title: "Mother-in-law",
  style: "skit",
  seconds: 30,
  scriptStatus: "approved",
  position: 1,
  slot: "",
  status: "todo",
  note: "",
  linesDone: [],
  lineChanges: {},
  updatedBy: "",
  updatedAt: "",
  shared: true,
  hooks: [{ hear: "She is coming in ten minutes." }, { text: "POV: ten minutes" }],
  beats: [
    { see: "She opens the cupboard", hear: "One pack, the whole house.", text: "Pack ZERO STRESS" },
    { see: "Close on the shine" },
    {},
  ],
  cta: "Order today",
  hook: 1,
  talent: ["Yasmine"],
  set: "Kitchen",
  props: [],
  extraProps: "",
  ...over,
});

const day = (over: Partial<ShootDay> = {}): ShootDay => ({
  id: "d1",
  day: "2026-11-25",
  title: "Day 1",
  callTime: "08:30",
  wrapTime: "18:00",
  place: "Studio",
  address: "Rue de Marseille, Tunis",
  mapLink: "",
  notes: "Bring the blue mop",
  state: "planned",
  privateNotes: null,
  authorName: "Heni",
  updatedAt: "",
  reels: [reel()],
  people: [{ id: "p1", name: "Ali", role: "DOP", side: "crew", callTime: "07:45", phone: null }],
  log: [],
  ...over,
});

describe("readerLines", () => {
  it("puts every hook option first, then the body, then the call to action", () => {
    const lines = readerLines(reel());
    expect(lines.map((l) => l.key)).toEqual(["hook-0", "hook-1", "beat-0", "beat-1", "cta"]);
    expect(lines[1]).toMatchObject({ words: "POV: ten minutes", chosen: true });
    expect(lines[0]!.chosen).toBe(false);
  });

  it("keeps what we see and the words on screen next to the spoken words", () => {
    const body = readerLines(reel())[2]!;
    expect(body).toMatchObject({
      words: "One pack, the whole house.",
      see: "She opens the cupboard",
      onScreen: "Pack ZERO STRESS",
    });
    // A direction with no words is still read, so the talent knows the shot.
    expect(readerLines(reel())[3]).toMatchObject({ words: "", see: "Close on the shine" });
  });

  it("reads the words as changed on set, and remembers what was written", () => {
    const lines = readerLines(reel({ lineChanges: { cta: "Order it today" } }));
    expect(lines.at(-1)).toMatchObject({ words: "Order it today", written: "Order today" });
  });

  it("has nothing to read for a draft the client can't see yet", () => {
    expect(readerLines(reel({ hooks: [], beats: [], cta: "" }))).toEqual([]);
  });
});

describe("line edits on set", () => {
  it("ticks each line once, in a stable order", () => {
    expect(toggleLine(["hook-0"], "beat-0", true)).toEqual(["beat-0", "hook-0"]);
    expect(toggleLine(["beat-0", "hook-0"], "beat-0", true)).toEqual(["beat-0", "hook-0"]);
    expect(toggleLine(["beat-0", "hook-0"], "hook-0", false)).toEqual(["beat-0"]);
  });

  it("only keeps a change when the words differ from the script", () => {
    expect(changeLine({}, "cta", "Order it today ", "Order today")).toEqual({
      cta: "Order it today",
    });
    expect(changeLine({ cta: "x" }, "cta", "Order today", "Order today")).toEqual({});
    expect(changeLine({ cta: "x" }, "cta", "  ", "Order today")).toEqual({});
  });

  it("estimates the read time at the pace of an ad", () => {
    expect(readSeconds(readerLines(reel()))).toBe(6);
  });
});

describe("the day", () => {
  it("counts progress and finds the next reel", () => {
    const reels = [
      reel({ id: "a", status: "done" }),
      reel({ id: "b", status: "todo" }),
      reel({ id: "c", status: "shooting" }),
      reel({ id: "d", status: "pickup" }),
    ];
    expect(progress(reels)).toEqual({ total: 4, done: 1, shooting: 1, pickup: 1 });
    expect(nextReel(reels)?.id).toBe("c");
    expect(nextReel([reel({ status: "done" })])).toBeNull();
  });

  it("splits upcoming days from past ones", () => {
    const { upcoming, past } = splitDays(
      [{ day: "2026-11-30" }, { day: "2026-11-01" }, { day: "2026-11-10" }, { day: "2026-11-05" }],
      "2026-11-10",
    );
    expect(upcoming.map((d) => d.day)).toEqual(["2026-11-10", "2026-11-30"]);
    expect(past.map((d) => d.day)).toEqual(["2026-11-05", "2026-11-01"]);
  });

  it("says when a day is", () => {
    expect(relativeDay("2026-11-10", "2026-11-10")).toBe("Today");
    expect(relativeDay("2026-11-11", "2026-11-10")).toBe("Tomorrow");
    expect(relativeDay("2026-11-25", "2026-11-10")).toBe("In 15 days");
    expect(relativeDay("2026-11-08", "2026-11-10")).toBe("2 days ago");
  });

  it("links to the map: the link given, or else a search for the address", () => {
    expect(mapHref({ mapLink: "https://maps.example/x", address: "", place: "" })).toBe(
      "https://maps.example/x",
    );
    expect(mapHref({ mapLink: "", address: "Rue de Marseille", place: "" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rue%20de%20Marseille",
    );
    expect(mapHref({ mapLink: "", address: " ", place: "" })).toBeNull();
  });

  it("dials Tunisian numbers on WhatsApp", () => {
    expect(whatsappTo("54 080 938")).toBe("https://wa.me/21654080938");
    expect(whatsappTo("+33 6 12 34 56 78")).toBe("https://wa.me/33612345678");
    expect(whatsappTo("123")).toBeNull();
    expect(whatsappTo(null)).toBeNull();
  });

  it("writes the call sheet for WhatsApp", () => {
    const sheet = callSheet("Dany Clean", day({ reels: [reel({ slot: "10:30" })] }));
    expect(sheet).toContain("*Dany Clean: Day 1*");
    expect(sheet).toContain("Call 08:30 · Wrap 18:00");
    expect(sheet).toContain("Where: Studio, Rue de Marseille, Tunis");
    expect(sheet).toContain("- Ali (DOP), 07:45");
    expect(sheet).toContain("1. 10:30 Mother-in-law: Yasmine");
    expect(sheet).toContain("Bring the blue mop");
  });
});

describe("normaliseShootPage", () => {
  it("survives missing and odd fields", () => {
    const page = normaliseShootPage({
      team: true,
      canPlan: true,
      days: [
        { id: "d", day: "2026-11-25", state: "weird", reels: [{ status: "nope", hook: "x" }] },
      ],
    });
    expect(page.canTick).toBe(false);
    expect(page.days[0]!.state).toBe("planned");
    expect(page.days[0]!.reels[0]).toMatchObject({ status: "todo", hook: null, shared: true });
    expect(normaliseShootPage(null)).toEqual({
      team: false,
      canPlan: false,
      canTick: false,
      days: [],
      scripts: [],
    });
  });
});
