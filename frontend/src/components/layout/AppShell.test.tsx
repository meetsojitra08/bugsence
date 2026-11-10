import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./AppLayout";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { clearTokens } from "@/lib/apiClient";
import * as projectsHook from "@/features/projects/hooks/useProjects";
import * as issuesHook from "@/features/issues/hooks/useIssues";
import { useProjectStore } from "@/stores/useProjectStore";
import { useUiStore } from "@/stores/useUiStore";

const baseProject = {
  id: "proj-1",
  name: "BugSense Core",
  key: "BUG",
  description: "",
  owner_id: "u-1",
  archived: false,
  members_count: 2,
  inbox_count: 3,
  total_issues_count: 6,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/today"]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AppLayout and App Shell", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
    useUiStore.setState({ isCaptureModalOpen: false, isCommandPaletteOpen: false });
    useProjectStore.getState().setCurrentProjectId("proj-1");

    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [baseProject],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    vi.spyOn(projectsHook, "useProjectMembers").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjectMembers>);

    vi.spyOn(issuesHook, "useInbox").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useInbox>);

    vi.spyOn(issuesHook, "useLabels").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useLabels>);
  });

  it("renders navigation links and hides Insights until project reaches 15 issues", () => {
    renderWithProviders(<AppLayout />);

    expect(screen.getByTestId("app-topbar")).toBeDefined();
    expect(screen.getAllByRole("link", { name: /^today$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /inbox/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^issues$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^board$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^members$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^settings$/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^insights$/i })).toBeNull();
    expect(screen.getByTestId("nav-inbox-badge")).toHaveTextContent("3");
  });

  it("shows Insights link once project reaches 15+ total issues", () => {
    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [{ ...baseProject, total_issues_count: 15 }],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    renderWithProviders(<AppLayout />);
    expect(screen.getAllByRole("link", { name: /^insights$/i }).length).toBeGreaterThan(0);
  });

  it("opens command palette on search button click", () => {
    renderWithProviders(<AppLayout />);

    expect(screen.queryByTestId("command-palette-dialog")).toBeNull();

    const searchBtn = screen.getByRole("button", {
      name: /search or execute actions/i,
    });
    fireEvent.click(searchBtn);

    expect(screen.getByTestId("command-palette-dialog")).toBeDefined();
    expect(screen.getByPlaceholderText(/type a command or search/i)).toBeDefined();
  });

  it("opens Capture modal globally when pressing C outside inputs", () => {
    renderWithProviders(<AppLayout />);

    expect(screen.queryByTestId("create-issue-form")).toBeNull();
    fireEvent.keyDown(window, { key: "c" });

    expect(screen.getByTestId("create-issue-form")).toBeDefined();
  });
});
