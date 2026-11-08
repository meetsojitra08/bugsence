import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("renders hero section with headline, subhead and CTA buttons", () => {
    renderLanding();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /AI-Native Issue Tracking Built for Fast Engineering Teams/i
    );
    expect(screen.getByTestId("hero-cta-demo")).toBeInTheDocument();
    expect(screen.getByText(/Create Free Account/i)).toBeInTheDocument();
  });

  it("renders core feature grid cards", () => {
    renderLanding();

    expect(screen.getByText("AI Triage & Auto-Fill")).toBeInTheDocument();
    expect(screen.getByText("pgvector Duplicate Detection")).toBeInTheDocument();
    expect(screen.getByText("60 FPS Drag-and-Drop Board")).toBeInTheDocument();
    expect(screen.getByText("Executive Velocity Analytics")).toBeInTheDocument();
  });

  it("interacts with live AI triage simulator presets", async () => {
    renderLanding();

    expect(screen.getByTestId("ai-simulator")).toBeInTheDocument();

    // Select second preset: Memory Leak in WS
    const preset1 = screen.getByTestId("preset-btn-1");
    fireEvent.click(preset1);

    await waitFor(() => {
      expect(screen.getByTestId("simulated-title")).toHaveTextContent(
        /Clean up WebSocket event listeners on notification bell unmount/i
      );
    });

    // Click run simulation
    const runBtn = screen.getByTestId("run-ai-simulation-btn");
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByTestId("simulated-title")).toBeInTheDocument();
    });
  });

  it("toggles FAQ accordion items", () => {
    renderLanding();

    expect(screen.getByTestId("faq-accordion")).toBeInTheDocument();
    const faqToggle1 = screen.getByTestId("faq-toggle-1");

    // Click to open FAQ #1
    fireEvent.click(faqToggle1);
    expect(
      screen.getByText(/Click the 'Try Live Demo' button anywhere on this page/i)
    ).toBeInTheDocument();
  });

  it("triggers loginAsDemo when clicking demo CTA", async () => {
    renderLanding();

    const demoBtn = screen.getByTestId("hero-cta-demo");
    fireEvent.click(demoBtn);

    expect(mockLoginAsDemo).toHaveBeenCalled();
  });
});
