import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IssuesPage } from "./pages/IssuesPage";
import { useProjectStore } from "@/stores/useProjectStore";
import { SafeMarkdown } from "./utils/markdown";

function renderWithProviders(ui: React.ReactElement, initialEntry = "/issues") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("IssuesPage UI", () => {
  beforeEach(() => {
    localStorage.setItem("bugsense_demo_mode", "true");
    useProjectStore.getState().setCurrentProjectId("demo-project-1");
  });

  it("renders filter bar, search input, status chips, and issue table", async () => {
    renderWithProviders(<IssuesPage />);

    expect(screen.getByTestId("issues-page")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("issues-search-input")).toBeDefined();
      expect(screen.getByTestId("status-chip-all")).toBeDefined();
      expect(screen.getByTestId("create-issue-btn")).toBeDefined();
      expect(screen.getByTestId("issues-table")).toBeDefined();
      expect(screen.getByText("BUG-1")).toBeDefined();
    });
  });

  it("filters table when clicking a status chip", async () => {
    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByText("BUG-1")).toBeDefined();
    });

    const doneChip = screen.getByTestId("status-chip-done");
    fireEvent.click(doneChip);

    await waitFor(() => {
      expect(screen.getByText("BUG-4")).toBeDefined();
    });
  });

  it("opens create issue modal when clicking New Issue button", async () => {
    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByTestId("create-issue-btn")).toBeDefined();
    });

    const createBtn = screen.getByTestId("create-issue-btn");
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId("create-issue-form")).toBeDefined();
      expect(screen.getByTestId("create-issue-title-input")).toBeDefined();
    });
  });

  it("opens create issue modal on global 'C' keypress", async () => {
    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByTestId("create-issue-btn")).toBeDefined();
    });

    fireEvent.keyDown(window, { key: "c" });

    await waitFor(() => {
      expect(screen.getByTestId("create-issue-form")).toBeDefined();
    });
  });

  it("opens issue detail panel when clicking a table row", async () => {
    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByTestId("issue-row-1")).toBeDefined();
    });

    const row = screen.getByTestId("issue-row-1");
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByTestId("issue-detail-panel")).toBeDefined();
      expect(screen.getByTestId("panel-status-select")).toBeDefined();
    });
  });

  it("switches tabs between details and activity in detail panel", async () => {
    renderWithProviders(<IssuesPage />);

    await waitFor(() => {
      expect(screen.getByTestId("issue-row-1")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("issue-row-1"));

    await waitFor(() => {
      expect(screen.getByTestId("tab-activity")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("tab-activity"));

    await waitFor(() => {
      expect(screen.getByTestId("activity-timeline")).toBeDefined();
    });
  });
});

describe("SafeMarkdown Sanitization", () => {
  it("renders headings, code blocks and lists without unsafe script execution", () => {
    const rawContent = "# Title\n- Item 1\n`inline code`\n<script>alert('xss')</script>";
    const { container } = render(<SafeMarkdown content={rawContent} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("Title");
    expect(container.textContent).toContain("inline code");
    expect(container.textContent).toContain("<script>alert('xss')</script>");
  });
});
