import { describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/useProjectStore";
import type { Project } from "./types";

describe("useProjectStore", () => {
  const mockProjects: Project[] = [
    {
      id: "proj-1",
      name: "BugSense Web",
      key: "WEB",
      description: "Web frontend",
      owner_id: "user-1",
      archived: false,
      members_count: 2,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "proj-2",
      name: "BugSense Backend",
      key: "API",
      description: "API server",
      owner_id: "user-2",
      archived: true,
      members_count: 1,
      created_at: "2026-01-02T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    },
  ];

  it("stores and clears current project id", () => {
    const store = useProjectStore.getState();
    store.setCurrentProjectId("proj-1");
    expect(useProjectStore.getState().currentProjectId).toBe("proj-1");

    store.setCurrentProjectId(null);
    expect(useProjectStore.getState().currentProjectId).toBeNull();
  });

  it("auto-selects first non-archived project when no active project is set", () => {
    const store = useProjectStore.getState();
    store.setCurrentProjectId(null);

    const active = store.getActiveProject(mockProjects);
    expect(active?.id).toBe("proj-1");
    expect(useProjectStore.getState().currentProjectId).toBe("proj-1");
  });

  it("returns currently selected project if present in list", () => {
    const store = useProjectStore.getState();
    store.setCurrentProjectId("proj-2");

    const active = store.getActiveProject(mockProjects);
    expect(active?.id).toBe("proj-2");
  });
});
