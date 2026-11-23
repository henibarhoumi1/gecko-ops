import type { Lead } from "./model";
import {
  instagramUrl,
  later,
  notAFit,
  queue,
  replied,
  score,
  sent,
  streak,
  whatsappUrl,
} from "./session";

const lead = (over: Partial<Lead>): Lead => ({
  workspace_id: "w",
  id: over.id ?? "l1",
  brand: "Brand",
  stage: "prospect",
  channel: null,
  contact: null,
  handle: null,
  phone: null,
  whatsapp: null,
  url: null,
  sector: null,
  pack: null,
  value: null,
  client_id: null,
  owner_member_id: null,
  next_step: null,
  next_date: null,
  lost_reason: null,
  history: [],
  log: [],
  extra: {},
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  ...over,
});

const today = "2026-11-21";

describe("queue", () => {
  const leads = [
    lead({ id: "fresh" }),
    lead({ id: "today", stage: "contacted", next_date: today }),
    lead({ id: "late", stage: "contacted", next_date: "2026-11-18" }),
    lead({ id: "future", stage: "contacted", next_date: "2026-11-30" }),
    lead({ id: "lost", stage: "lost" }),
    lead({ id: "theirs", owner_member_id: "m2", next_date: today }),
  ];

  it("puts late first, then today, then fresh prospects, and skips the rest", () => {
    expect(queue(leads, today, "m1", "mine").map((l) => l.id)).toEqual(["late", "today", "fresh"]);
  });

  it("shows everyone's leads when asked", () => {
    expect(queue(leads, today, "m1", "all").map((l) => l.id)).toContain("theirs");
  });
});

describe("sending and scoring", () => {
  it("logs who sent the message and sets the next follow-up", () => {
    const next = sent(lead({}), "first", "dm", "Salut", `${today}T09:00:00Z`, "m1");
    expect(next.stage).toBe("contacted");
    expect(next.next_date).toBe("2026-11-24");
    expect(next.owner_member_id).toBe("m1");
    expect((next.log[next.log.length - 1] as { by: string }).by).toBe("m1");
  });

  it("counts today's touches for the team and for me, and the streak", () => {
    const leads = [
      lead({
        id: "a",
        log: [
          { at: `${today}T09:00:00Z`, text: "x", by: "m1" },
          { at: "2026-11-20T09:00:00Z", text: "y" },
          { at: "2026-11-19T09:00:00Z", text: "z" },
        ],
        history: [{ at: "2026-11-20", stage: "conversation" }],
      }),
      lead({ id: "b", log: [{ at: `${today}T10:00:00Z`, text: "x", by: "m2" }] }),
    ];
    expect(score(leads, today, "m1")).toEqual({ team: 2, mine: 1, streak: 3, wins: 1 });
    expect(streak(leads, "2026-11-22")).toBe(3);
    expect(streak(leads, "2026-11-25")).toBe(0);
  });
});

describe("other answers", () => {
  it("moves a reply into a conversation, due today", () => {
    const r = replied(lead({}), today, "m1");
    expect(r.stage).toBe("conversation");
    expect(r.next_date).toBe(today);
  });

  it("puts a lead off by a day, or closes it as not a fit", () => {
    expect(later(lead({}), today).next_date).toBe("2026-11-22");
    const n = notAFit(lead({}), today, "bad_fit");
    expect(n.stage).toBe("lost");
    expect(n.next_date).toBeNull();
  });
});

describe("links", () => {
  it("builds Instagram links from handles and pasted URLs", () => {
    expect(instagramUrl("@maison.lumiere")).toBe("https://instagram.com/maison.lumiere");
    expect(instagramUrl("https://www.instagram.com/dany.clean/?hl=fr")).toBe(
      "https://instagram.com/dany.clean",
    );
    expect(instagramUrl("")).toBeNull();
  });

  it("builds WhatsApp links, adding Tunisia's code to 8-digit numbers", () => {
    expect(whatsappUrl("26 191 555", "Hi")).toBe("https://wa.me/21626191555?text=Hi");
    expect(whatsappUrl(null, "Hi")).toBeNull();
  });
});
