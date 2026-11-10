import { describe, expect, it } from "vitest";
import { canEdit, dueLabel, dueTone, openFor, sortTasks, whoFor, type Task } from "./model";

const task = (patch: Partial<Task>): Task => ({
  id: "x",
  clientId: "c",
  projectId: null,
  title: "T",
  notes: "",
  side: "gecko",
  assignee: "",
  due: null,
  private: false,
  link: "",
  doneAt: null,
  doneBy: "",
  fromClient: false,
  mine: false,
  author: "",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
  ...patch,
});

describe("tasks", () => {
  it("colours the due date", () => {
    const today = "2026-11-10";
    expect(dueTone(task({ due: "2026-11-09" }), today)).toBe("late");
    expect(dueTone(task({ due: "2026-11-10" }), today)).toBe("today");
    expect(dueTone(task({ due: "2026-11-12" }), today)).toBe("soon");
    expect(dueTone(task({ due: "2026-11-30" }), today)).toBe("later");
    expect(dueTone(task({ due: "2026-11-01", doneAt: "x" }), today)).toBe("none");
    expect(dueLabel("2026-11-11", today)).toBe("Tomorrow");
    expect(dueLabel("2026-11-07", today)).toBe("3 days late");
    expect(dueLabel(null, today)).toBe("");
  });

  it("puts open tasks first, by due date, no date last", () => {
    const list = sortTasks([
      task({ id: "done", doneAt: "2026-11-09T00:00:00Z" }),
      task({ id: "nodate" }),
      task({ id: "later", due: "2026-12-01" }),
      task({ id: "soon", due: "2026-11-11" }),
    ]);
    expect(list.map((x) => x.id)).toEqual(["soon", "later", "nodate", "done"]);
  });

  it("says who it's for and who may change it", () => {
    expect(whoFor(task({ side: "client", assignee: "Olfa" }), "client")).toBe("You · Olfa");
    expect(whoFor(task({ side: "client" }), "team")).toBe("Client");
    expect(whoFor(task({ side: "gecko", assignee: "Sami" }), "team")).toBe("Gecko · Sami");
    expect(openFor([task({ side: "client" }), task({ side: "gecko" })], "client")).toHaveLength(1);
    expect(canEdit(task({ mine: false }), "client")).toBe(false);
    expect(canEdit(task({ mine: false }), "team")).toBe(true);
  });
});
