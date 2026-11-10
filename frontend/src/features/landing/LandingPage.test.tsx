import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "./LandingPage";
import * as authHook from "@/features/auth/hooks/useAuth";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LandingPage Component", () => {
  let queryClient: QueryClient;
  const mockStartDemo = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    mockStartDemo.mockResolvedValue({ id: "demo-1", key: "DEMO", name: "Acme Checkout" });

    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      startDemo: mockStartDemo,
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

  it("renders the redesigned hero headline and demo CTA", () => {
    renderLanding();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Messy bug report in. Clear ticket out.");
    expect(screen.getAllByRole("button", { name: /try the demo workspace/i }).length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByRole("link", { name: /sign in to existing project/i })).toBeInTheDocument();
  });

  it("renders the interactive 3-stage demo and switches stages on tab click", () => {
    renderLanding();

    expect(screen.getByRole("tab", { name: /1\. Paste/i })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: /2\. Triaged/i }));
    expect(screen.getByRole("tab", { name: /2\. Triaged/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText(/Drafted from report/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /3\. Assigned/i }));
    expect(screen.getByText(/Accepted to Todo/i)).toBeInTheDocument();
  });

  it("renders the before/after comparison and the 3 core benefits", () => {
    renderLanding();

    expect(screen.getByText(/Before · Incoming report/i)).toBeInTheDocument();
    expect(screen.getByText("Inbox with AI triage")).toBeInTheDocument();
    expect(screen.getByText("Duplicate detection")).toBeInTheDocument();
    expect(screen.getByText("GitHub and Slack built in")).toBeInTheDocument();
  });

  it("launches zero-signup demo workspace when clicking Try the demo workspace", async () => {
    renderLanding();

    const ctaButtons = screen.getAllByRole("button", { name: /try the demo workspace/i });
    fireEvent.click(ctaButtons[0]);

    await waitFor(() => {
      expect(mockStartDemo).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/today");
    });
  });
});
