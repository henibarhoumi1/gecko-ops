import { navFor } from "./nav";

const paths = (role: Parameters<typeof navFor>[0]) => navFor(role).map((n) => n.path);

describe("navFor", () => {
  it("gives the founder everything", () => {
    expect(paths("founder")).toEqual(["today", "pipeline", "clients", "team", "alerts"]);
  });

  it("lands the founder and producers on Today, editors on their clients", () => {
    expect(paths("founder")[0]).toBe("today");
    expect(paths("sales")[0]).toBe("today");
    expect(paths("editor")[0]).toBe("clients");
  });

  it("keeps the pipeline to the founder and client leads", () => {
    for (const role of ["editor", "assistant"] as const)
      expect(paths(role)).not.toContain("pipeline");
    expect(paths("sales")).toContain("pipeline");
  });

  it("keeps alerts to the founder and producers", () => {
    expect(paths("sales")).toContain("alerts");
    for (const role of ["editor", "assistant"] as const)
      expect(paths(role)).not.toContain("alerts");
  });

  it("gives editors the clients they are on, and the team list", () => {
    expect(paths("editor")).toEqual(["clients", "team"]);
  });

  it("gives everyone a screen to land on", () => {
    for (const role of ["founder", "sales", "editor", "assistant"] as const)
      expect(paths(role).length).toBeGreaterThan(0);
  });
});
