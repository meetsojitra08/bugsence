import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { clearTokens } from "@/lib/apiClient";

vi.mock("./api/authApi", () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      user: {
        id: "user-1",
        email: "engineer@company.com",
        fullName: "Alex Morgan",
        avatarUrl: "",
        displayName: "Alex Morgan",
      },
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

function TestAuthConsumer() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "authenticated" : "guest"}</div>
      <div data-testid="user-email">{user?.email || "none"}</div>
      <button onClick={() => login({ email: "engineer@company.com", password: "pass" })} data-testid="btn-login">
        Log in
      </button>
      <button onClick={() => logout()} data-testid="btn-logout">
        Logout
      </button>
    </div>
  );
}

describe("AuthContext and ProtectedRoute", () => {
  beforeEach(() => {
    clearTokens();
  });

  it("provides authentication state and handles account login and logout", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Initial state
    expect(screen.getByTestId("auth-status").textContent).toBe("guest");
    expect(screen.getByTestId("user-email").textContent).toBe("none");

    // Sign in with a registered account
    await act(async () => {
      screen.getByTestId("btn-login").click();
    });

    expect(screen.getByTestId("auth-status").textContent).toBe("authenticated");
    expect(screen.getByTestId("user-email").textContent).toBe("engineer@company.com");

    // Click logout
    await act(async () => {
      screen.getByTestId("btn-logout").click();
    });

    expect(screen.getByTestId("auth-status").textContent).toBe("guest");
    expect(screen.getByTestId("user-email").textContent).toBe("none");
  });

  it("redirects unauthenticated user in ProtectedRoute", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("Login Page")).toBeDefined();
    expect(screen.queryByText("Secret Dashboard")).toBeNull();
  });
});
