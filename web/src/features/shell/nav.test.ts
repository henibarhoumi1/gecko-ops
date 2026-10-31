import { navFor } from "./nav";

const paths = (role: Parameters<typeof navFor>[0]) => navFor(role).map((n) => n.path);

describe("navFor", () => {
  it("gives the founder everything", () => {
    expect(paths("founder")).toEqual([
      "today",
      "pipeline",
      "clients",
      "projects",
      "calendar",
      "money",
      "team",
    ]);
  });

  it("never shows money to anyone but the founder", () => {
    for (const role of ["sales", "editor", "assistant"] as const)
      expect(paths(role)).not.toContain("money");
  });

  it("keeps editors to their own work, plus the concepts of clients they are on", () => {
    expect(paths("editor")).toEqual(["today", "clients", "projects", "calendar"]);
  });
});
