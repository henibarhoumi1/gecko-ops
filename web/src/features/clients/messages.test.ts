import { describe, expect, it } from "vitest";
import { inviteMessage, nudgeMessage } from "./messages";

describe("client messages", () => {
  it("invites with a password, not an email link", () => {
    const en = inviteMessage("en", "RareRich", "https://x/invite/1");
    expect(en).toContain("choose a password");
    expect(en).not.toMatch(/email/i);
    expect(inviteMessage("fr", "RareRich", "u")).toContain("mot de passe");
  });
  it("says what is waiting, with the right grammar", () => {
    expect(nudgeMessage("en", { ideas: 2, scripts: 1 }, "u")).toContain(
      "2 ideas and 1 script are waiting",
    );
    expect(nudgeMessage("en", { ideas: 1, scripts: 0 }, "u")).toContain("1 idea is waiting");
    expect(nudgeMessage("fr", { ideas: 1, scripts: 0 }, "u")).toContain("1 idée vous attend");
    expect(nudgeMessage("fr", { ideas: 0, scripts: 3 }, "u")).toContain("3 scripts vous attendent");
    expect(nudgeMessage("en", { ideas: 0, scripts: 0 }, "u")).toContain("update");
  });
});
