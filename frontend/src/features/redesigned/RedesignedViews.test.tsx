import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InboxPage } from "@/features/issues/pages/InboxPage";
import { PublicReportPage } from "@/features/issues/pages/PublicReportPage";
import { InviteAcceptPage } from "@/features/projects/pages/InviteAcceptPage";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { useProjectStore } from "@/stores/useProjectStore";
import * as projectsHook from "@/features/projects/hooks/useProjects";
import * as issuesHook from "@/features/issues/hooks/useIssues";
import * as authHook from "@/features/auth/hooks/useAuth";
import * as apiClient from "@/lib/apiClient";
import { projectsApi } from "@/features/projects/api/projectsApi";
import type { IssueListItem } from "@/features/issues/types";

const inboxItems: IssueListItem[] = [
  {
    id: "in-1",
    number: 10,
    key: "WEB-10",
    project_key: "WEB",
    title: "Customer hit 500 on invoice PDF download",
    description: "Traceback in pdf_renderer.py line 44",
    status: "inbox",
    priority: "high",
    severity: "major",
    type: "bug",
    source: "email",
    external_reporter_name: "Pat Customer",
    external_reporter_email: "pat@customer.io",
    reporter: { id: "u-1", email: "dev@team.dev", full_name: "Dev" },
    assignee: null,
    labels: [],
    due_date: null,
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "in-2",
    number: 11,
    key: "WEB-11",
    project_key: "WEB",
    title: "Dark mode contrast off on mobile menu",
    description: "",
    status: "inbox",
    priority: "low",
    severity: "minor",
    type: "bug",
    source: "slack",
    reporter: { id: "u-1", email: "dev@team.dev", full_name: "Dev" },
    assignee: null,
    labels: [],
    due_date: null,
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("Redesigned Workflows (Inbox, Onboarding, Public Report, Invite Accept)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.restoreAllMocks();
    useProjectStore.getState().setCurrentProjectId("proj-web");

    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: {
        id: "u-1",
        email: "dev@team.dev",
        fullName: "Dev One",
        displayName: "Dev",
        avatarUrl: "",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      startDemo: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  it("renders two-pane Inbox and supports keyboard J/K navigation and E accept triage", async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});

    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [
        {
          id: "proj-web",
          name: "Web App",
          key: "WEB",
          description: "",
          owner_id: "u-1",
          archived: false,
          members_count: 2,
          triage_rotation_enabled: true,
          current_triager: { id: "u-1", email: "dev@team.dev", full_name: "Dev One" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    vi.spyOn(projectsHook, "useProjectMembers").mockReturnValue({
      data: [
        {
          id: "m-1",
          user: { id: "u-1", email: "dev@team.dev", full_name: "Dev One" },
          role: "owner",
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjectMembers>);

    vi.spyOn(issuesHook, "useInbox").mockReturnValue({
      data: inboxItems,
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useInbox>);

    vi.spyOn(issuesHook, "useTriageInbox").mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof issuesHook.useTriageInbox>);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InboxPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("inbox-page")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-list")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-preview")).toBeInTheDocument();
    expect(screen.getByText(/triager:/i)).toBeInTheDocument();

    // Move selection down with 'J'
    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByTestId("inbox-preview")).toHaveTextContent(
      "Dark mode contrast off on mobile menu"
    );

    // Accept selected report with 'E'
    fireEvent.keyDown(window, { key: "e" });
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        issueId: "in-2",
        payload: expect.objectContaining({ action: "accept" }),
      });
    });
  });

  it("renders OnboardingFlow Step 1 with auto key preview from project name", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OnboardingFlow onComplete={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Create your first project")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Project name/i), {
      target: { value: "Checkout Service" },
    });
    expect(screen.getByText(/CS-1|CHK-1|CH-1/i)).toBeInTheDocument();
  });

  it("submits public external bug report without login and shows key confirmation", async () => {
    vi.spyOn(apiClient, "apiRequest")
      .mockResolvedValueOnce({
        project_name: "Web App",
        project_key: "WEB",
        enabled: true,
        welcome_message: "Report issues directly to the team.",
      })
      .mockResolvedValueOnce({ key: "WEB-77" });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/report/WEB"]}>
          <Routes>
            <Route path="/report/:projectKey" element={<PublicReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/What happened\?/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/What happened\?/i), {
      target: { value: "Checkout button freezes on Safari" },
    });
    fireEvent.change(screen.getByLabelText(/Your email/i), {
      target: { value: "user@acme.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send to Inbox/i }));

    await waitFor(() => {
      expect(screen.getByTestId("public-report-success")).toHaveTextContent(
        "Report received (WEB-77)"
      );
    });
  });

  it("renders InviteAcceptPage with login/register ?next= links when unauthenticated", async () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      startDemo: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.spyOn(projectsApi, "getPublicInvite").mockResolvedValueOnce({
      project_name: "Web App",
      project_key: "WEB",
      email: "newdev@acme.dev",
      role: "member",
      status: "pending",
      invited_by: "Alex Rivera",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/invite/tok-123"]}>
          <Routes>
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Join Web App")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create account to join/i })).toHaveAttribute(
      "href",
      "/register?next=/invite/tok-123"
    );
  });
});
