import {
  clearPendingInvite,
  parseInviteCode,
  readPendingInvite,
  savePendingInvite,
} from "./inviteCode";

const code = "ab".repeat(32);

describe("parseInviteCode", () => {
  it("reads a bare code", () => expect(parseInviteCode(code.toUpperCase())).toBe(code));
  it("reads a link", () =>
    expect(parseInviteCode(`https://app.gecko-creative.com/invite/${code}`)).toBe(code));
  it("rejects anything else", () => expect(parseInviteCode("abc123")).toBeNull());
});

describe("pending invite", () => {
  it("round-trips through local storage", () => {
    savePendingInvite(code);
    expect(readPendingInvite()).toBe(code);
    clearPendingInvite();
    expect(readPendingInvite()).toBeNull();
  });
});
