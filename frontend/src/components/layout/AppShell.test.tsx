import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./AppLayout";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { clearTokens } from "@/lib/apiClient";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AppLayout and App Shell", () => {
  beforeEach(() => {
    clearTokens();
  });

  it("renders desktop sidebar navigation links", () => {
    renderWithProviders(<AppLayout />);

    expect(screen.getByTestId("app-topbar")).toBeDefined();
    expect(screen.getAllByRole("link", { name: /dashboard/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /issues/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /board/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /team members/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /settings/i }).length).toBeGreaterThan(0);
  });

  it("opens command palette on search button click", () => {
    renderWithProviders(<AppLayout />);

    // Initial state: dialog not visible
    expect(screen.queryByTestId("command-palette-dialog")).toBeNull();

    // Click search trigger in topbar
    const searchBtn = screen.getByRole("button", {
      name: /search or execute actions/i,
    });
    fireEvent.click(searchBtn);

    // Dialog should be open
    expect(screen.getByTestId("command-palette-dialog")).toBeDefined();
    expect(screen.getByPlaceholderText(/type a command or search/i)).toBeDefined();
  });
});
