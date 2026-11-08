import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App root integration", () => {
  it("renders login page by default for unauthenticated visitors", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /try demo account/i })).toBeDefined();
  });
});
