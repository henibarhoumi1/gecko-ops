import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("maps database error codes", () => {
    expect(friendlyError({ message: "workspace_exists" })).toMatch(/already set up/);
    expect(friendlyError(new Error("invalid_invite"))).toMatch(/invite link/);
  });

  it("explains password reset limits", () => {
    expect(
      friendlyError({
        message: "For security purposes, you can only request this after 42 seconds.",
      }),
    ).toMatch(/Wait a minute/);
    expect(
      friendlyError({ message: "New password should be different from the old password." }),
    ).toMatch(/haven't used/);
  });

  it("falls back to a generic message", () => {
    expect(friendlyError("boom")).toBe("Something went wrong. Try again.");
  });
});
