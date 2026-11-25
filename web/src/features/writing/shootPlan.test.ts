import { describe, expect, it } from "vitest";
import {
  initials,
  picked,
  planCount,
  planNames,
  planSets,
  samePlan,
  tidyPlan,
  toggle,
  withSets,
  type ShootChoices,
} from "./shootPlan";

const choices: ShootChoices = {
  talent: [
    { id: "t1", name: "Firas Krifa", photos: ["a.jpg"], stands: "ready" },
    { id: "t2", name: "Houde - Mom", photos: [], stands: "waiting" },
  ],
  sets: [
    { id: "s1", name: "Kitchen", photos: [] },
    { id: "s2", name: "Bathroom", photos: [] },
  ],
  props: [{ id: "p1", name: "Apron", photos: [] }],
  places: [{ id: "l1", name: "The Blue Oasis", photos: [] }],
};

describe("shoot plan", () => {
  it("reads the sets list, or the old single set", () => {
    expect(planSets({ sets: ["s1", "s2"], set: "s1" })).toEqual(["s1", "s2"]);
    expect(planSets({ set: "l1" })).toEqual(["l1"]);
    expect(planSets({})).toEqual([]);
    expect(planSets(undefined)).toEqual([]);
  });

  it("keeps the first set as the single set", () => {
    expect(withSets({ talent: ["t1"] }, ["s2", "s1", "s2"])).toEqual({
      talent: ["t1"],
      sets: ["s2", "s1"],
      set: "s2",
    });
    expect(withSets({ set: "s1" }, [])).toEqual({ sets: [], set: null });
  });

  it("toggles a pick", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
    expect(toggle(undefined, "a")).toEqual(["a"]);
  });

  it("counts what's picked", () => {
    expect(planCount({ talent: ["t1"], sets: ["s1", "s2"], props: ["p1"], extraProps: " " })).toBe(
      4,
    );
    expect(planCount({ set: "l1", extraProps: "A TV" })).toBe(2);
  });

  it("tidies a plan before it's saved", () => {
    expect(tidyPlan({ talent: ["t1", "t1"], set: "s1", extraProps: "  A TV " })).toEqual({
      talent: ["t1"],
      sets: ["s1"],
      set: "s1",
      props: [],
      extraProps: "A TV",
    });
  });

  it("compares plans, the order of sets included", () => {
    expect(samePlan({ talent: ["t1", "t2"] }, { talent: ["t2", "t1"] })).toBe(true);
    expect(samePlan({ sets: ["s1", "s2"] }, { sets: ["s2", "s1"] })).toBe(false);
    expect(samePlan({ set: "s1" }, { sets: ["s1"] })).toBe(true);
    expect(samePlan(undefined, {})).toBe(true);
  });

  it("names what's picked, in the plan's order, older place sets included", () => {
    expect(picked(choices.talent, ["t2", "gone", "t1"]).map((c) => c.id)).toEqual(["t2", "t1"]);
    expect(
      planNames({ talent: ["t1"], sets: ["s2", "l1"], props: ["p1"], extraProps: "A TV" }, choices),
    ).toEqual({
      talent: ["Firas Krifa"],
      sets: ["Bathroom", "The Blue Oasis"],
      props: ["Apron", "A TV"],
    });
  });

  it("makes initials for a face without a photo", () => {
    expect(initials("Firas Krifa")).toBe("FK");
    expect(initials("Houde - Mom")).toBe("HM");
    expect(initials("")).toBe("·");
  });
});
