import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "./LandingPage";
import * as authHook from "@/features/auth/hooks/useAuth";

const mockLoginAsDemo = vi.fn().mockResolvedValue(undefined);

describe("LandingPage Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      loginAsDemo: mockLoginAsDemo,
      updateUser: vi.fn(),
    });
  });

  const renderLanding = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LandingPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders the hero headline, subhead and calls to action", () => {
    renderLanding();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/paste the mess/i);
    expect(heading).toHaveTextContent(/ship the fix/i);
    expect(screen.getByTestId("hero-cta-demo")).toBeInTheDocument();
    expect(screen.getAllByText(/Create free account/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/4 teammates · 2 projects · 40\+ issues/i)).toBeInTheDocument();
  });

  it("renders the core feature grid", () => {
    renderLanding();

    expect(screen.getByText("A triage pass that fills the form")).toBeInTheDocument();
    expect(screen.getByText("Duplicates, caught before filing")).toBeInTheDocument();
    expect(screen.getByText("A board that keeps up")).toBeInTheDocument();
    expect(screen.getByText("Analytics without the query tax")).toBeInTheDocument();
  });

  it("previews structured triage output and labels the example honestly", async () => {
    renderLanding();

    expect(screen.getByTestId("ai-simulator")).toBeInTheDocument();
    expect(screen.getByText(/Illustrative preview/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("preset-btn-1"));

    await waitFor(
      () => {
        expect(screen.getByTestId("simulated-title")).toHaveTextContent(
          /Clean up WebSocket event listeners on notification bell unmount/i
        );
      },
      { timeout: 4000 }
    );

    fireEvent.click(screen.getByTestId("run-ai-simulation-btn"));
    expect(screen.getByTestId("simulated-title")).toBeInTheDocument();
  });

  it("switches the product tour with pointer and keyboard", () => {
    renderLanding();

    expect(screen.getByTestId("tour-panel-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("tour-tab-dashboard")).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByTestId("tour-tab-board"));
    expect(screen.getByTestId("tour-panel-board")).toBeInTheDocument();
    expect(screen.queryByTestId("tour-panel-dashboard")).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId("tour-tab-board"), { key: "ArrowRight" });
    expect(screen.getByTestId("tour-tab-issue")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("tour-panel-issue")).toBeInTheDocument();
  });

  it("toggles FAQ disclosure state and hides the panel from assistive tech when closed", () => {
    renderLanding();

    expect(screen.getByTestId("faq-accordion")).toBeInTheDocument();
    const faqToggle1 = screen.getByTestId("faq-toggle-1");
    const panel = document.getElementById("faq-panel-1");

    expect(faqToggle1).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(faqToggle1);

    expect(faqToggle1).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText(/Not for the demo/i)).toBeInTheDocument();

    fireEvent.click(faqToggle1);
    expect(faqToggle1).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the mobile navigation menu", () => {
    renderLanding();

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    expect(within(mobileNav).getByText("Workflow")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
  });

  it("shows an honest scope split", () => {
    renderLanding();

    expect(screen.getByText("In this build")).toBeInTheDocument();
    expect(screen.getByText("Deliberately next")).toBeInTheDocument();
    expect(screen.getByText(/No roadmap theatre/i)).toBeInTheDocument();
  });

  it("triggers loginAsDemo when clicking the hero demo CTA", () => {
    renderLanding();

    fireEvent.click(screen.getByTestId("hero-cta-demo"));

    expect(mockLoginAsDemo).toHaveBeenCalled();
  });
});
