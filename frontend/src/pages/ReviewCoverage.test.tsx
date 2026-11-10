import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/app/theme-provider";
import { SettingsPage } from "./SettingsPage";
import { ProjectMembersPage } from "@/features/projects/pages/ProjectMembersPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ActivityItem } from "@/features/issues/components/timeline/ActivityItem";
import { buildGitBranchName, formatTimeAgo } from "@/lib/format";
import { useProjectStore } from "@/stores/useProjectStore";
import { authApi } from "@/features/auth/api/authApi";
import { projectsApi } from "@/features/projects/api/projectsApi";
import * as authHooks from "@/features/auth/hooks/useAuth";
import * as projectsHooks from "@/features/projects/hooks/useProjects";
import * as issuesHooks from "@/features/issues/hooks/useIssues";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Implementation Review Fixes Coverage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useProjectStore.getState().setCurrentProjectId("proj-1");

    vi.spyOn(authHooks, "useAuth").mockReturnValue({
      user: {
        id: "u-owner",
        email: "alex@bugsense.dev",
        fullName: "Alex Chen",
        displayName: "AC",
        avatarUrl: "",
        timezone: "UTC",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      startDemo: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.spyOn(projectsHooks, "useProjects").mockReturnValue({
      data: [
        {
          id: "proj-1",
          name: "Acme Checkout",
          key: "ACME",
          description: "Checkout backend",
          owner_id: "u-owner",
          my_role: "owner",
          archived: false,
          members_count: 2,
          ai_auto_triage: true,
          ai_confidence_threshold: 0.6,
          ai_priority_rules: { default_priority: "medium", urgent_keywords: ["outage"] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHooks.useProjects>);

    vi.spyOn(projectsHooks, "useProjectMembers").mockReturnValue({
      data: [
        {
          id: "m-1",
          user: { id: "u-owner", email: "alex@bugsense.dev", full_name: "Alex Chen" },
          role: "owner",
          created_at: new Date().toISOString(),
        },
        {
          id: "m-2",
          user: { id: "u-dev", email: "maya@bugsense.dev", full_name: "Maya Patel" },
          role: "member",
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHooks.useProjectMembers>);
  });

  it("formats recent timestamps without 'just now ago' and breaks branch names cleanly", () => {
    expect(formatTimeAgo(new Date().toISOString())).toBe("just now");
    expect(formatTimeAgo(new Date(Date.now() - 5 * 60_000).toISOString())).toBe("5m ago");
    const branch = buildGitBranchName(
      "CHK-42",
      "Unhandled exception on checkout payment confirmation screen"
    );
    expect(branch).not.toMatch(/-payme/);
    expect(branch).toBe("chk-42-unhandled-exception-on-checkout");
  });

  it("renders external report attribution cleanly via 'received' activity verb", () => {
    render(
      <ActivityItem
        item={{
          type: "activity",
          id: "act-1",
          actor: null,
          verb: "received",
          field: "email",
          old_value: "",
          new_value: "Elena",
          body: "",
          is_edited: false,
          edited_at: null,
          created_at: new Date().toISOString(),
        }}
      />
    );
    expect(screen.getByText(/Received via email/i)).toBeInTheDocument();
    expect(screen.getByText("Elena")).toBeInTheDocument();
  });

  it("exposes Forgot password link on LoginPage and submits ForgotPasswordPage cleanly", async () => {
    renderWithProviders(<LoginPage />);
    const forgotLink = screen.getByRole("link", { name: /Forgot password\?/i });
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");

    const spy = vi
      .spyOn(authApi, "forgotPassword")
      .mockResolvedValueOnce({ message: "If an account exists for that email, reset instructions have been sent." });

    renderWithProviders(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/Work email/i), {
      target: { value: "alex@bugsense.dev" },
    });
    fireEvent.submit(screen.getByTestId("forgot-password-form"));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("alex@bugsense.dev");
      expect(screen.getByTestId("forgot-password-sent")).toBeInTheDocument();
    });
  });

  it("disables Slack notification checkboxes when Slack is off and shows AI rules + Integration test in Settings", async () => {
    vi.spyOn(issuesHooks, "useLabels").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHooks.useLabels>);

    vi.spyOn(projectsHooks, "useProjectIntegrations").mockReturnValue({
      data: [
        {
          id: "int-slack",
          provider: "slack",
          enabled: false,
          config: {},
          webhook_secret: "sec-slack-123",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "int-gh",
          provider: "github",
          enabled: true,
          config: {},
          webhook_secret: "sec-gh-123",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsHooks.useProjectIntegrations>);

    renderWithProviders(<SettingsPage />);

    // Slack notification checkboxes must be disabled until Slack integration is enabled
    const slackPref = screen.getByLabelText("Issue assigned to me via slack") as HTMLInputElement;
    expect(slackPref.disabled).toBe(true);

    // Project tab has AI threshold & priority rules
    fireEvent.click(screen.getByTestId("settings-tab-project"));
    expect(screen.getByTestId("proj-ai-threshold-select")).toBeInTheDocument();
    expect(screen.getByTestId("proj-default-priority-select")).toBeInTheDocument();
    expect(screen.getByTestId("proj-urgent-keywords-input")).toBeInTheDocument();

    // Integrations tab renders signing secret controls & Test setup button
    const testSpy = vi
      .spyOn(projectsApi, "testIntegration")
      .mockResolvedValueOnce({ ok: true, provider: "github", message: "GitHub endpoint ready" });

    fireEvent.click(screen.getByTestId("settings-tab-integrations"));
    fireEvent.click(screen.getByTestId("test-integration-github"));
    await waitFor(() => {
      expect(testSpy).toHaveBeenCalledWith("proj-1", "github");
    });
  });

  it("always shows Pending invites section and explicit Remove confirmation on ProjectMembersPage", () => {
    vi.spyOn(projectsHooks, "useProjectInvites").mockReturnValue({
      data: [],
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsHooks.useProjectInvites>);

    renderWithProviders(<ProjectMembersPage />);

    expect(screen.getByTestId("pending-invites-list")).toHaveTextContent("Pending invites (0)");
    expect(screen.getByText("No pending email or link invites.")).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: /Remove member Maya Patel/i });
    expect(removeBtn).toHaveTextContent("Remove");
    fireEvent.click(removeBtn);
    expect(screen.getByText(/Remove Maya Patel from Acme Checkout\?/i)).toBeInTheDocument();
  });
});
