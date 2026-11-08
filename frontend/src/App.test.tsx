import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App root integration", () => {
  it("renders marketing landing page by default for unauthenticated visitors", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /AI-Native Issue Tracking Built for Fast Engineering Teams/i
    );
    expect(screen.getByTestId("hero-cta-demo")).toBeInTheDocument();
  });
});
