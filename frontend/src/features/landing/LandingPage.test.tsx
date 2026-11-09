import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "./LandingPage";
import * as authHook from "@/features/auth/hooks/useAuth";

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
    expect(heading).toHaveTextContent(/turn bug reports/i);
    expect(heading).toHaveTextContent(/find the next clear step/i);
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore product features/i })).toBeInTheDocument();
  });

  it("renders the core feature grid", () => {
    renderLanding();

    expect(screen.getByText("Turn rough reports into clear issues")).toBeInTheDocument();
    expect(screen.getByText("Spot similar reports early")).toBeInTheDocument();
    expect(screen.getByText("A board that shows the next step")).toBeInTheDocument();
    expect(screen.getByText("Understand project health at a glance")).toBeInTheDocument();
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
    expect(screen.getByText(/Create, assign, prioritize and track issues/i)).toBeInTheDocument();

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

  it("shows the product principles and open-source path", () => {
    renderLanding();

    expect(screen.getByText("The details stay with the work.")).toBeInTheDocument();
    expect(screen.getByText("Open source under the MIT License")).toBeInTheDocument();
  });

});
