import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import React from "react";
import { issuesApi } from "./api/issuesApi";
import { useIssueUrlFilters } from "./hooks/useIssues";

describe("issuesApi (Demo Mode)", () => {
  beforeEach(() => {
    localStorage.setItem("bugsense_demo_mode", "true");
  });

  it("lists demo issues with default pagination structure", async () => {
    const res = await issuesApi.list("demo-project-1");
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.count).toBe(res.results.length);
    expect(res.results[0].key).toContain("BUG-");
  });

  it("filters demo issues by status", async () => {
    const res = await issuesApi.list("demo-project-1", { status: "in_progress" });
    expect(res.results.every((i) => i.status === "in_progress")).toBe(true);
  });

  it("filters demo issues by search text", async () => {
    const res = await issuesApi.list("demo-project-1", { search: "token" });
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].title.toLowerCase()).toContain("token");
  });

  it("creates a new issue in demo mode", async () => {
    const before = await issuesApi.list("demo-project-1");
    const countBefore = before.count;

    const created = await issuesApi.create("demo-project-1", {
      title: "New Automated Test Issue",
      status: "todo",
      priority: "high",
    });

    expect(created.title).toBe("New Automated Test Issue");
    expect(created.key).toContain("BUG-");

    const after = await issuesApi.list("demo-project-1");
    expect(after.count).toBe(countBefore + 1);
  });

  it("updates an existing issue in demo mode", async () => {
    const list = await issuesApi.list("demo-project-1");
    const firstIssue = list.results[0];

    const updated = await issuesApi.update(firstIssue.id, {
      title: "Updated Title for Unit Test",
      status: "done",
    });

    expect(updated.title).toBe("Updated Title for Unit Test");
    expect(updated.status).toBe("done");
  });

  it("deletes an issue in demo mode", async () => {
    const created = await issuesApi.create("demo-project-1", {
      title: "Temporary Issue to Delete",
    });

    const beforeDelete = await issuesApi.list("demo-project-1");
    expect(beforeDelete.results.some((i) => i.id === created.id)).toBe(true);

    await issuesApi.delete(created.id);

    const afterDelete = await issuesApi.list("demo-project-1");
    expect(afterDelete.results.some((i) => i.id === created.id)).toBe(false);
  });
});

describe("useIssueUrlFilters", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={["/issues?status=todo&priority=urgent&search=crash"]}>
      {children}
    </MemoryRouter>
  );

  it("parses filters from URL search params", () => {
    const { result } = renderHook(() => useIssueUrlFilters(), { wrapper });

    expect(result.current.filters.status).toBe("todo");
    expect(result.current.filters.priority).toBe("urgent");
    expect(result.current.filters.search).toBe("crash");
    expect(result.current.activeFilterCount).toBe(3);
  });

  it("sets a new filter and updates active count", () => {
    const { result } = renderHook(() => useIssueUrlFilters(), { wrapper });

    act(() => {
      result.current.setFilter("assignee", "sarah-user-id");
    });

    expect(result.current.filters.assignee).toBe("sarah-user-id");
    expect(result.current.activeFilterCount).toBe(4);
  });

  it("clears all active filters", () => {
    const { result } = renderHook(() => useIssueUrlFilters(), { wrapper });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.status).toBeUndefined();
    expect(result.current.filters.priority).toBeUndefined();
    expect(result.current.filters.search).toBeUndefined();
    expect(result.current.activeFilterCount).toBe(0);
  });
});
