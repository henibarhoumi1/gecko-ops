import { describe, expect, it } from "vitest";
import { setsForProject, type ProjectSet } from "./setsModel";

const set = (o: Partial<ProjectSet>): ProjectSet => ({
  id: "s",
  projectId: "p1",
  name: "Kitchen",
  notes: "",
  position: 1,
  ...o,
});

describe("the set list of a campaign", () => {
  it("keeps the campaign's sets and the ones for every campaign, in order", () => {
    const list = [
      set({ id: "b", name: "Bathroom", position: 2 }),
      set({ id: "o", projectId: "p2", name: "Office" }),
      set({ id: "a", name: "Kitchen", position: 1 }),
      set({ id: "all", projectId: null, name: "White wall", position: 3 }),
    ];
    expect(setsForProject(list, "p1").map((s) => s.id)).toEqual(["a", "b", "all"]);
    expect(setsForProject(list, null)).toHaveLength(4);
  });
});
