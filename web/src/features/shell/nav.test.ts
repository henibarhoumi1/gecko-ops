import { navFor } from "./nav";

const paths = (role: Parameters<typeof navFor>[0]) => navFor(role).map((n) => n.path);

describe("navFor", () => {
  it("gives the founder everything", () => {
    expect(paths("founder")).toEqual([
      "today",
      "pipeline",
      "clients",
      "shoots",
      "talent",
      "locations",
      "team",
      "alerts",
      "trash",
    ]);
  });

  it("lands everyone on Home (today): one dashboard, the founder just sees more", () => {
    for (const role of ["founder", "sales", "editor", "assistant"] as const)
      expect(paths(role)[0]).toBe("today");
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

  it("gives editors the clients they are on, their shoots, and the team list", () => {
    expect(paths("editor")).toEqual(["today", "clients", "shoots", "talent", "locations", "team"]);
  });

  it("gives everyone on the team the shoots", () => {
    for (const role of ["founder", "sales", "editor", "assistant"] as const)
      expect(paths(role)).toContain("shoots");
    expect(paths("assistant")).toEqual(["today", "shoots", "talent", "locations", "team"]);
  });

  it("gives everyone a screen to land on", () => {
    for (const role of ["founder", "sales", "editor", "assistant"] as const)
      expect(paths(role).length).toBeGreaterThan(0);
  });
});

describe("sidebar groups", () => {
  it("puts Today first, the work in the middle, the studio last", () => {
    const groups = navFor("founder").map((n) => n.group);
    expect(groups).toEqual([
      "home",
      "work",
      "work",
      "work",
      "work",
      "work",
      "studio",
      "studio",
      "studio",
    ]);
  });
});
