import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { KeyboardShortcutsModal } from "@/components/common/KeyboardShortcutsModal";
import { OnboardingChecklist } from "@/features/dashboard/components/OnboardingChecklist";

const BombComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Deliberate test explosion");
  }
  return <div>Component is fine</div>;
};

describe("Product Polish UI Components", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("NotFoundPage (404)", () => {
    it("renders custom 404 page with actions", () => {
      render(
        <BrowserRouter>
          <NotFoundPage />
        </BrowserRouter>
      );

      expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
      expect(screen.getByText("Issue Not Found")).toBeInTheDocument();
      expect(screen.getByText("Return to Dashboard")).toBeInTheDocument();
      expect(screen.getByText(/Search Everything/i)).toBeInTheDocument();
    });
  });

  describe("ErrorBoundary", () => {
    it("renders fallback UI when an unhandled child error occurs", () => {
      // Suppress console.error in test output for deliberate throw
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <BombComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Deliberate test explosion")).toBeInTheDocument();
      expect(screen.getByText("Reload Page")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("renders children normally when no error occurs", () => {
      render(
        <ErrorBoundary>
          <BombComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Component is fine")).toBeInTheDocument();
    });
  });

  describe("KeyboardShortcutsModal", () => {
    it("opens on '?' keypress and displays shortcut groups", () => {
      render(<KeyboardShortcutsModal />);

      expect(screen.queryByTestId("shortcuts-modal-dialog")).not.toBeInTheDocument();

      // Trigger '?' keydown
      fireEvent.keyDown(window, { key: "?" });

      expect(screen.getByTestId("shortcuts-modal-dialog")).toBeInTheDocument();
      expect(screen.getByText("Global Navigation")).toBeInTheDocument();
      expect(screen.getByText("Issues & AI Actions")).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByTestId("close-shortcuts-modal");
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId("shortcuts-modal-dialog")).not.toBeInTheDocument();
    });
  });

  describe("OnboardingChecklist", () => {
    const mockProject = {
      id: "p-1",
      name: "BugSense Core",
      key: "BUG",
      description: "Core tracker",
      owner_id: "u-1",
      archived: false,
      members_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("renders milestones and completion percentage", () => {
      render(
        <BrowserRouter>
          <OnboardingChecklist project={mockProject} totalIssues={5} />
        </BrowserRouter>
      );

      expect(screen.getByTestId("onboarding-checklist")).toBeInTheDocument();
      expect(screen.getByText("Workspace Setup Guide")).toBeInTheDocument();
      expect(screen.getByTestId("checklist-item-project")).toBeInTheDocument();
      expect(screen.getByTestId("checklist-item-issue")).toBeInTheDocument();
    });

    it("dismisses checklist and saves state to localStorage", () => {
      render(
        <BrowserRouter>
          <OnboardingChecklist project={mockProject} totalIssues={5} />
        </BrowserRouter>
      );

      const dismissBtn = screen.getByTestId("dismiss-checklist-btn");
      fireEvent.click(dismissBtn);

      expect(screen.queryByTestId("onboarding-checklist")).not.toBeInTheDocument();
      expect(localStorage.getItem("bugsense_onboarding_dismissed")).toBe("true");
    });
  });
});
