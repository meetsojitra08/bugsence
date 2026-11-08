import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BoardPage } from "./pages/BoardPage";
import { useProjectStore } from "@/stores/useProjectStore";

function renderWithProviders(ui: React.ReactElement, initialEntry = "/board") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BoardPage UI", () => {
  beforeEach(() => {
    localStorage.setItem("bugsense_demo_mode", "true");
    useProjectStore.getState().setCurrentProjectId("demo-project-1");
  });

  it("renders kanban board with columns and switcher", async () => {
    renderWithProviders(<BoardPage />);

    expect(screen.getByTestId("board-page")).toBeDefined();
    expect(screen.getByTestId("board-view-active")).toBeDefined();
    expect(screen.getByTestId("switch-to-list-view")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("kanban-board")).toBeDefined();
      expect(screen.getByTestId("kanban-column-todo")).toBeDefined();
      expect(screen.getByTestId("kanban-column-in_progress")).toBeDefined();
      expect(screen.getByTestId("kanban-column-done")).toBeDefined();
    });
  });

  it("renders cards within their respective status columns", async () => {
    renderWithProviders(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-card-BUG-1")).toBeDefined();
    });

    const inProgressCol = screen.getByTestId("kanban-column-in_progress");
    expect(inProgressCol.textContent).toContain("BUG-1");
  });

  it("opens issue detail panel when a kanban card is clicked", async () => {
    renderWithProviders(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("kanban-card-BUG-1")).toBeDefined();
    });

    const card = screen.getByTestId("kanban-card-BUG-1");
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByTestId("issue-detail-panel")).toBeDefined();
      expect(screen.getByTestId("panel-status-select")).toBeDefined();
    });
  });

  it("renders quick add button and form at bottom of column", async () => {
    renderWithProviders(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("quick-add-btn-todo")).toBeDefined();
    });

    const quickAddBtn = screen.getByTestId("quick-add-btn-todo");
    fireEvent.click(quickAddBtn);

    expect(screen.getByTestId("quick-add-form-todo")).toBeDefined();
    expect(screen.getByTestId("quick-add-input-todo")).toBeDefined();
  });
});
