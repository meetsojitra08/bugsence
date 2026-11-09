import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateProjectModal } from "./components/CreateProjectModal";
import { generateSuggestedKey } from "./utils/keyGenerator";
import { ProjectBadge } from "./components/ProjectBadge";
import { ProjectSwitcher } from "./components/ProjectSwitcher";

vi.mock("./hooks/useProjects", () => ({
  useProjects: () => ({
    data: [
      {
        id: "proj-1",
        name: "BugSense Core",
        key: "BUG",
        description: "Core tracker",
        owner_id: "user-1",
        archived: false,
        my_role: "owner",
        members_count: 2,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    isLoading: false,
  }),
  useCreateProject: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Projects UI Components", () => {
  describe("generateSuggestedKey helper", () => {
    it("generates uppercase abbreviations correctly", () => {
      expect(generateSuggestedKey("Web Application")).toBe("WA");
      expect(generateSuggestedKey("Platform Core Services")).toBe("PCS");
      expect(generateSuggestedKey("Backend")).toBe("BAC");
      expect(generateSuggestedKey("")).toBe("");
    });
  });

  describe("ProjectBadge", () => {
    it("renders uppercase initials", () => {
      render(<ProjectBadge name="BugSense Core" projectKey="BUG" />);
      expect(screen.getByText("BUG")).toBeInTheDocument();
    });
  });

  describe("CreateProjectModal", () => {
    it("renders inputs and updates key suggestion on name change", () => {
      renderWithClient(<CreateProjectModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByText("Create New Project")).toBeInTheDocument();
      const nameInput = screen.getByLabelText(/project name/i);
      const keyInput = screen.getByLabelText(/project key/i);

      fireEvent.change(nameInput, { target: { value: "Mobile Client" } });
      expect(keyInput).toHaveValue("MC");
    });
  });

  describe("ProjectSwitcher", () => {
    it("renders active project and opens dropdown on click", () => {
      renderWithClient(<ProjectSwitcher />);

      const switcherButton = screen.getByRole("button", { name: /switch project/i });
      expect(switcherButton).toBeInTheDocument();

      fireEvent.click(switcherButton);
      expect(screen.getByText("Create New Project")).toBeInTheDocument();
    });
  });
});
