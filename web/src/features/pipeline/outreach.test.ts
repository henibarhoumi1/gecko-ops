import type { Lead } from "./model";
import {
  addDays,
  afterSend,
  claudeBrief,
  compose,
  lastTouchText,
  parseLine,
  parsePaste,
  suggestedMoment,
  touches,
} from "./outreach";

const lead = (over: Partial<Lead> = {}): Lead =>
  ({
    workspace_id: "w",
    id: "l1",
    brand: "Crush Cookies",
    stage: "prospect",
    channel: "ig_organic",
    contact: "Salma Ben Ali",
    handle: "@crush__cookies",
    phone: null,
    whatsapp: null,
    url: "https://www.instagram.com/crush__cookies",
    sector: "Food",
    pack: null,
    value: null,
    client_id: null,
    owner_member_id: null,
    next_step: null,
    next_date: null,
    lost_reason: null,
    history: [{ at: "2026-11-01", stage: "prospect" }],
    log: [],
    extra: {},
    created_at: "",
    updated_at: "",
    ...over,
  }) as Lead;

describe("adding leads fast", () => {
  it("reads handles, profile links, websites and plain names", () => {
    expect(parseLine("@crush__cookies")).toEqual({
      brand: "Crush Cookies",
      handle: "@crush__cookies",
      url: "https://www.instagram.com/crush__cookies",
      channel: "ig_organic",
    });
    expect(parseLine("https://www.instagram.com/benma_tn/?hl=fr")).toMatchObject({
      handle: "@benma_tn",
      brand: "Benma Tn",
    });
    expect(parseLine("tiktok.com/@dany_clean2")).toMatchObject({
      handle: "@dany_clean2",
      channel: "tiktok_organic",
      url: "https://www.tiktok.com/@dany_clean2",
    });
    expect(parseLine("rarerichtn.com")).toMatchObject({
      brand: "Rarerichtn",
      handle: null,
      url: "https://rarerichtn.com",
    });
    expect(parseLine("2. Hera Labs")).toMatchObject({ brand: "Hera Labs", handle: null });
    expect(parseLine("   ")).toBeNull();
  });

  it("skips repeats and leads already in the pipeline", () => {
    const { fresh, skipped } = parsePaste(
      "@crush__cookies\n@new_brand\ninstagram.com/new_brand\nBenma",
      [
        { brand: "Crush", handle: "@Crush__Cookies" },
        { brand: "benma", handle: null },
      ],
    );
    expect(fresh.map((f) => f.handle ?? f.brand)).toEqual(["@new_brand"]);
    expect(skipped).toEqual(["@crush__cookies", "@new_brand", "Benma"]);
  });
});

describe("messages", () => {
  it("greets the contact by first name and opens with what you noticed", () => {
    const text = compose(
      lead({ extra: { noticed: "Your Ramadan box sold out in two days" } }),
      "first",
      "en",
    );
    expect(text).toMatch(/^Hi Salma, Heni from Gecko/);
    expect(text).toContain("Your Ramadan box sold out in two days. We make");
    expect(text).toContain("for Crush Cookies?");
  });

  it("greets the brand when there's no contact, in each language", () => {
    expect(compose(lead({ contact: null }), "follow", "fr")).toMatch(/^Bonjour Crush Cookies,/);
    expect(compose(lead(), "first", "tn")).toMatch(/^Aslema Salma, ena Heni men Gecko/);
  });

  it("suggests the message that fits the stage", () => {
    expect(suggestedMoment(lead())).toBe("first");
    expect(suggestedMoment(lead({ stage: "contacted" }))).toBe("follow");
    expect(suggestedMoment(lead({ stage: "qualified" }))).toBe("after_call");
    expect(suggestedMoment(lead({ stage: "negotiation" }))).toBe("proposal");
    expect(
      suggestedMoment(
        lead({ stage: "contacted", log: [{ at: "a" }, { at: "b" }, { at: "c" }] as unknown[] }),
      ),
    ).toBe("last");
  });
});

describe("after sending", () => {
  it("logs the touch, moves a prospect to contacted and sets a follow-up in 3 days", () => {
    const next = afterSend(lead(), "first", "dm", "Hi", "2026-11-10T09:00:00Z", "m1");
    expect(next.stage).toBe("contacted");
    expect(next.history.at(-1)).toEqual({ at: "2026-11-10", stage: "contacted" });
    expect(next.next_step).toBe("Follow up");
    expect(next.next_date).toBe("2026-11-13");
    expect(next.owner_member_id).toBe("m1");
    expect(next.log).toEqual([
      { at: "2026-11-10T09:00:00Z", moment: "first", channel: "dm", text: "Hi" },
    ]);
  });

  it("never moves a lead backwards, and a last try parks it for later", () => {
    const later = lead({ stage: "proposal_sent", owner_member_id: "m2" });
    const follow = afterSend(later, "follow", "whatsapp", "x", "2026-11-10T09:00:00Z", "m1");
    expect(follow.stage).toBe("proposal_sent");
    expect(follow.history).toEqual(later.history);
    expect(follow.owner_member_id).toBe("m2");
    const last = afterSend(later, "last", "dm", "x", "2026-11-10T09:00:00Z", "m1");
    expect(last.stage).toBe("nurture");
    expect(last.next_date).toBe("2027-01-09");
  });

  it("reads the log newest first, including old entries, and says when the last touch was", () => {
    const l = lead({
      log: [
        { at: "2026-11-02", note: "Called, no answer" },
        { at: "2026-11-08T10:00:00Z", text: "DM sent" },
        "junk",
      ] as unknown[],
    });
    expect(touches(l).map((t) => t.text)).toEqual(["DM sent", "Called, no answer"]);
    expect(lastTouchText(l, "2026-11-10")).toBe("2 days ago");
    expect(lastTouchText(lead(), "2026-11-10")).toBe("never");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("writes a brief for Claude with the lead's details", () => {
    const brief = claudeBrief(lead({ extra: { noticed: "Great packaging" } }), "first", "tn", "dm");
    expect(brief).toContain("in Tunisian (Tunisian Derja in Latin letters");
    expect(brief).toContain("To: Salma Ben Ali at Crush Cookies (@crush__cookies).");
    expect(brief).toContain("What I noticed about them: Great packaging");
    expect(brief).not.toContain("\n\n\n");
  });
});
