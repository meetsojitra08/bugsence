import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App smoke test", () => {
  it("renders BugSense AI header", () => {
    render(<App />);
    expect(screen.getByText("BugSense AI")).toBeDefined();
    expect(screen.getByText("AI Triage Ready")).toBeDefined();
  });
});
