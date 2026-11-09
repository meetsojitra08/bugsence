import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { AuthProvider } from "../context/AuthContext";

describe("LoginPage UI", () => {
  it("renders login form and inputs correctly", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/^password$/i, { selector: "input" })).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("shows validation errors on empty submit", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeDefined();
      expect(screen.getByText(/password is required/i)).toBeDefined();
    });
  });

  it("toggles password visibility", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i, {
      selector: "input",
    }) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByLabelText(/show password/i);
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByLabelText(/hide password/i));
    expect(passwordInput.type).toBe("password");
  });
});

describe("RegisterPage UI", () => {
  it("renders register form fields and shows password strength on input", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeDefined();
    expect(screen.getByLabelText(/full name/i)).toBeDefined();
    expect(screen.getByLabelText(/work email/i)).toBeDefined();
    expect(screen.getByLabelText(/^password$/i, { selector: "input" })).toBeDefined();

    // Type a strong password
    const passwordInput = screen.getByLabelText(/^password$/i, { selector: "input" });
    fireEvent.change(passwordInput, { target: { value: "SuperSecret123!" } });

    await waitFor(() => {
      expect(screen.getByTestId("password-strength-meter")).toBeDefined();
      expect(screen.getByText("Strong")).toBeDefined();
    });
  });

  it("validates full name and password length on submit", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/full name must be at least 2 characters/i)).toBeDefined();
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeDefined();
    });
  });
});
