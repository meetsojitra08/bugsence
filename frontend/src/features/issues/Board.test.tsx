import { beforeEach, describe, expect, it } from "vitest";
import { issuesApi } from "./api/issuesApi";

describe("Board API (Demo Mode)", () => {
  beforeEach(() => {
    localStorage.setItem("bugsense_demo_mode", "true");
  });

  it("fetches kanban board data grouped into columns with counts", async () => {
    const board = await issuesApi.getBoard("demo-project-1");

    expect(board.columns).toBeDefined();
    expect(board.counts).toBeDefined();

    expect(Array.isArray(board.columns.todo)).toBe(true);
    expect(Array.isArray(board.columns.in_progress)).toBe(true);
    expect(Array.isArray(board.columns.done)).toBe(true);

    const totalCount = Object.values(board.counts).reduce((acc, c) => acc + c, 0);
    expect(totalCount).toBeGreaterThan(0);
  });

  it("filters board columns by priority", async () => {
    const board = await issuesApi.getBoard("demo-project-1", { priority: "urgent" });

    // Every item in any column must have priority urgent
    for (const columnItems of Object.values(board.columns)) {
      expect(columnItems.every((item) => item.priority === "urgent")).toBe(true);
    }
  });

  it("moves an issue to a new status and computes position", async () => {
    const boardBefore = await issuesApi.getBoard("demo-project-1");
    const todoIssue = boardBefore.columns.todo[0];
    expect(todoIssue).toBeDefined();

    const moved = await issuesApi.move(todoIssue.id, {
      status: "done",
    });

    expect(moved.id).toBe(todoIssue.id);
    expect(moved.status).toBe("done");

    const boardAfter = await issuesApi.getBoard("demo-project-1");
    expect(boardAfter.columns.done.some((i) => i.id === todoIssue.id)).toBe(true);
  });

  it("computes midpoint position when moving between two items", async () => {
    const moved = await issuesApi.move("demo-issue-1", {
      status: "todo",
      before_id: "demo-issue-2",
      after_id: "demo-issue-3",
    });

    expect(moved.status).toBe("todo");
    expect(typeof moved.position).toBe("number");
  });
});
