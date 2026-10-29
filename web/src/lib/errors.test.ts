import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("maps database error codes", () => {
    expect(friendlyError({ message: "workspace_exists" })).toMatch(/already set up/);
    expect(friendlyError(new Error("invalid_invite"))).toMatch(/invite link/);
  });

  it("falls back to a generic message", () => {
    expect(friendlyError("boom")).toBe("Something went wrong. Try again.");
  });
});
