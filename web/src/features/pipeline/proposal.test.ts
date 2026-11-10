import { describe, expect, it } from "vitest";
import {
  draftProposal,
  fullContent,
  lines,
  money,
  proposalMessage,
  proposalState,
} from "./proposal";

const lead = { brand: "Juice Co", pack: "Pro", value: null };

describe("proposals", () => {
  it("drafts from the lead's pack and value", () => {
    const d = draftProposal(lead, "en");
    expect(d.plan).toBe("pro");
    expect(d.price).toBe(3800);
    expect(d.reels).toBe(15);
    expect(d.intro).toContain("Juice Co");
    expect(draftProposal({ brand: "X", pack: "", value: 1500 }).price).toBe(1500);
    expect(draftProposal({ brand: "X", pack: "weird", value: null }).plan).toBe("test");
    expect(draftProposal(lead).lang).toBe("fr");
  });

  it("fills what an older proposal doesn't say", () => {
    const c = fullContent(
      { intro: "Hello", price: null, goals: ["A", 3 as unknown as string] },
      lead,
    );
    expect(c.intro).toBe("Hello");
    expect(c.price).toBeNull();
    expect(c.goals).toEqual(["A"]);
    expect(c.plan).toBe("pro");
  });

  it("writes money, the message and the state", () => {
    expect(money(2900, "fr")).toBe("2\u202f900 DT");
    expect(money(null, "en")).toBe("On quote");
    expect(proposalMessage("Juice Co", "https://x/p/t", "en", "Heni")).toContain("https://x/p/t");
    const now = new Date("2026-11-10T12:00:00Z");
    expect(
      proposalState({ hasLink: false, viewedAt: null, acceptedAt: null, expiresAt: null }, now),
    ).toBe("draft");
    expect(
      proposalState(
        { hasLink: true, viewedAt: null, acceptedAt: null, expiresAt: "2026-12-01T00:00:00Z" },
        now,
      ),
    ).toBe("sent");
    expect(
      proposalState(
        { hasLink: true, viewedAt: "x", acceptedAt: null, expiresAt: "2026-12-01T00:00:00Z" },
        now,
      ),
    ).toBe("viewed");
    expect(
      proposalState(
        { hasLink: true, viewedAt: "x", acceptedAt: null, expiresAt: "2026-11-01T00:00:00Z" },
        now,
      ),
    ).toBe("expired");
    expect(
      proposalState(
        { hasLink: true, viewedAt: "x", acceptedAt: "y", expiresAt: "2026-11-01T00:00:00Z" },
        now,
      ),
    ).toBe("accepted");
    expect(lines(" a \n\n b")).toEqual(["a", "b"]);
  });
});
