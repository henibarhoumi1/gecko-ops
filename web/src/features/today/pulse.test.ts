import { greeting, money, pulse, wonAt, type PulseLead } from "./pulse";

const lead = (over: Partial<PulseLead>): PulseLead => ({
  stage: "prospect",
  value: null,
  next_date: null,
  history: [],
  created_at: "2026-11-01T10:00:00Z",
  ...over,
});

describe("pulse", () => {
  const today = "2026-11-21";
  const tiles = pulse({
    today,
    leads: [
      lead({ stage: "contacted", value: 2900, next_date: "2026-11-20" }),
      lead({ stage: "proposal_sent", value: 3800, next_date: "2026-11-25" }),
      lead({
        stage: "won",
        value: 999,
        history: [{ at: "2026-11-12T09:00:00Z", stage: "won" }],
        created_at: "2026-11-18T08:00:00Z",
      }),
      lead({ stage: "lost", value: 5000 }),
    ],
    activeClients: 2,
    shoots: [{ day: "2026-11-25" }, { day: "2026-12-10" }],
    tasks: [
      { side: "gecko", due: "2026-11-19", doneAt: null },
      { side: "gecko", due: null, doneAt: null },
      { side: "client", due: "2026-11-01", doneAt: null },
    ],
  });
  const get = (key: string) => tiles.find((x) => x.key === key)!;

  it("adds up open leads only", () => {
    expect(get("pipeline").value).toBe("6 700 DT");
    expect(get("pipeline").hint).toBe("2 open leads");
  });

  it("counts deals won this month from the history", () => {
    expect(get("won").value).toBe("999 DT");
    expect(get("won").tone).toBe("good");
  });

  it("flags follow-ups that are due or late", () => {
    expect(get("follow").value).toBe("1");
    expect(get("follow").tone).toBe("alert");
  });

  it("counts this week's shoots and the team's late tasks", () => {
    expect(get("clients").hint).toBe("1 shoot this week");
    expect(get("tasks").value).toBe("2");
    expect(get("tasks").hint).toBe("1 late");
    expect(get("new").value).toBe("1");
  });
});

describe("helpers", () => {
  it("writes money with thin spaces", () => {
    expect(money(12400)).toBe("12 400");
    expect(money(999)).toBe("999");
  });

  it("finds the last win in a lead's history", () => {
    expect(wonAt({ stage: "won", history: [{ at: "2026-10-02T00:00:00Z", stage: "won" }] })).toBe(
      "2026-10-02",
    );
    expect(wonAt({ stage: "prospect", history: [] })).toBeNull();
  });

  it("greets by the hour", () => {
    expect(greeting(9)).toBe("Good morning");
    expect(greeting(14)).toBe("Good afternoon");
    expect(greeting(20)).toBe("Good evening");
  });
});
