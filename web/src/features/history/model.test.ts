import { describe, expect, it } from "vitest";
import { byDay, filterKinds, verb, whoDid, type HistoryEvent } from "./model";

const ev = (
  at: string,
  kind: HistoryEvent["kind"],
  patch: Partial<HistoryEvent> = {},
): HistoryEvent => ({
  at,
  who: "Heni",
  client: false,
  kind,
  title: "T",
  link: "/",
  ...patch,
});

describe("history", () => {
  it("groups by day, newest first", () => {
    const groups = byDay([
      ev("2026-11-08T10:00:00", "idea_added"),
      ev("2026-11-10T09:00:00", "task_done"),
      ev("2026-11-10T15:00:00", "script_approved"),
    ]);
    expect(groups.map((g) => [g.day, g.events.map((e) => e.kind)])).toEqual([
      ["2026-11-10", ["script_approved", "task_done"]],
      ["2026-11-08", ["idea_added"]],
    ]);
  });

  it("says who and what", () => {
    expect(whoDid({ who: "Sara", client: false }, "client")).toBe("Sara (Gecko)");
    expect(whoDid({ who: "Sara", client: false }, "team")).toBe("Sara");
    expect(whoDid({ who: "", client: true }, "team")).toBe("The client");
    expect(verb("script_approved")).toBe("approved the script");
    expect(filterKinds([ev("x", "removed"), ev("y", "task_done")], ["removed"])).toHaveLength(1);
    expect(filterKinds([ev("x", "removed")], [])).toHaveLength(1);
  });
});
