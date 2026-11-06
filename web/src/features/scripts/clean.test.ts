import { describe, expect, it } from "vitest";
import { cleanText } from "./clean";
import type { Script } from "./model";

const script = {
  id: "s1",
  conceptId: null,
  title: "The Man vs. The Cleaning List",
  style: "skit",
  seconds: 30,
  goal: "Order the pack",
  hooks: [{ hear: "Hook one" }, { hear: "Hook two" }],
  beats: [
    { part: "lead", see: "The list" },
    { part: "body", hear: "The match" },
  ],
  cta: "Order today",
  position: 0,
  status: "approved",
  version: 2,
  hook: 1,
  approvedVersion: 2,
  approvedAt: null,
  approvedBy: null,
  authorName: "Heni",
  createdAt: "",
  updatedAt: "",
  previous: null,
  notes: [],
  shoot: { talent: ["t1"], set: "l1", props: ["p1"], extraProps: "A remote" },
} as Script;

const options = [
  { id: "t1", name: "Sami" },
  { id: "l1", name: "Airbnb" },
  { id: "p1", name: "Zero Stress Pack" },
];

describe("cleanText", () => {
  it("keeps only the hook the client chose, then the parts in order", () => {
    const text = cleanText(script, options);
    expect(text).toContain("We hear: Hook two");
    expect(text).not.toContain("Hook one");
    expect(text.indexOf("LEAD")).toBeLessThan(text.indexOf("BODY 1"));
    expect(text.trim().endsWith("Order today")).toBe(true);
  });

  it("lists who, where and what", () => {
    const text = cleanText(script, options);
    expect(text).toContain("Talent: Sami");
    expect(text).toContain("Set: Airbnb");
    expect(text).toContain("Props: Zero Stress Pack, A remote");
  });

  it("shows every hook option before one is chosen", () => {
    const text = cleanText({ ...script, status: "review", hook: null }, options);
    expect(text).toContain("Hook one");
    expect(text).toContain("Hook two");
  });
});
