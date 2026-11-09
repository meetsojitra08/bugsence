import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App root integration", () => {
  it("renders marketing landing page by default for unauthenticated visitors", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Turn bug reports/i);
    expect(screen.getByRole("button", { name: /Get started/i })).toBeInTheDocument();
  });
});
