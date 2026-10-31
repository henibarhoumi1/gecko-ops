import { navFor } from "./nav";

const paths = (role: Parameters<typeof navFor>[0]) => navFor(role).map((n) => n.path);

describe("navFor", () => {
  it("gives the founder everything", () => {
    expect(paths("founder")).toEqual(["pipeline", "clients", "team"]);
  });

  it("keeps the pipeline to the founder and client leads", () => {
    for (const role of ["editor", "assistant"] as const)
      expect(paths(role)).not.toContain("pipeline");
    expect(paths("sales")).toContain("pipeline");
  });

  it("gives editors the clients they are on, and the team list", () => {
    expect(paths("editor")).toEqual(["clients", "team"]);
  });

  it("gives everyone a screen to land on", () => {
    for (const role of ["founder", "sales", "editor", "assistant"] as const)
      expect(paths(role).length).toBeGreaterThan(0);
  });
});
