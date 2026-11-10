import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "../dashboard/DashboardPage";
import { InsightsPage } from "../dashboard/InsightsPage";
import { DashboardKpis } from "../dashboard/components/DashboardKpis";
import { StatusDistributionChart } from "../dashboard/components/StatusDistributionChart";
import { SeverityPriorityBreakdown } from "../dashboard/components/SeverityPriorityBreakdown";
import { WorkloadChart } from "../dashboard/components/WorkloadChart";
import { AIInsightCard } from "../dashboard/components/AIInsightCard";
import * as authHook from "@/features/auth/hooks/useAuth";
import * as projectsHook from "@/features/projects/hooks/useProjects";
import * as analyticsHook from "@/features/projects/hooks/useAnalytics";
import * as issuesHook from "@/features/issues/hooks/useIssues";

// Mock Recharts ResponsiveContainer for jsdom layout safety
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-responsive-container" style={{ width: 600, height: 300 }}>
        {children}
      </div>
    ),
  };
});

const mockUser = {
  id: "user-1",
  email: "alex@bugsense.dev",
  fullName: "Alex Rivera",
  displayName: "Alex",
  avatarUrl: "",
};

const mockProject = {
  id: "proj-123",
  name: "BugSense Core",
  key: "BUG",
  description: "Core tracking platform",
  owner_id: "user-1",
  archived: false,
  my_role: "owner" as const,
  members_count: 3,
  total_issues_count: 25,
  inbox_count: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockOverview = {
  total_issues: 25,
  open_issues: 15,
  closed_issues: 10,
  overdue_issues: 3,
  avg_resolution_days: 4.2,
  by_status: {
    backlog: 5,
    todo: 4,
    in_progress: 4,
    in_review: 2,
    done: 8,
    closed: 2,
  },
  by_priority: {
    urgent: 4,
    high: 6,
    medium: 10,
    low: 5,
  },
  by_severity: {
    critical: 3,
    major: 5,
    minor: 12,
    trivial: 5,
  },
};

const mockTrends = [
  { date: "2026-11-01", created: 2, resolved: 1 },
  { date: "2026-11-02", created: 4, resolved: 3 },
  { date: "2026-11-03", created: 1, resolved: 2 },
];

const mockWorkload = [
  {
    user: {
      id: "u-1",
      email: "alex@bugsense.dev",
      full_name: "Alex Rivera",
    },
    count: 7,
    by_priority: { urgent: 2, high: 2, medium: 3, low: 0 },
  },
  {
    user: null,
    count: 3,
    by_priority: { urgent: 1, high: 1, medium: 1, low: 0 },
  },
];

const mockTodayData = {
  summary: {
    inbox_count: 2,
    stale_inbox_count: 0,
    assigned_to_you_count: 1,
    blocking_release_count: 1,
    total_issues: 25,
    triager: { id: "user-1", full_name: "Alex Rivera", email: "alex@bugsense.dev" },
    is_current_user_triager: true,
  },
  your_work: [
    {
      id: "iss-1",
      key: "BUG-12",
      project_key: "BUG",
      number: 12,
      title: "Fix Safari payment token crash",
      type: "bug" as const,
      status: "in_progress" as const,
      priority: "high" as const,
      severity: "major" as const,
      position: 0,
      assignee: { id: "user-1", email: "alex@bugsense.dev", full_name: "Alex Rivera" },
      reporter: { id: "user-1", email: "alex@bugsense.dev", full_name: "Alex Rivera" },
      labels: [],
      due_date: null,
      is_blocking_release: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  waiting_on_you: {
    prs_awaiting_review: [],
    mentions: [],
    resolved_reported: [],
  },
  team_pulse: [
    {
      user: { id: "user-1", email: "alex@bugsense.dev", full_name: "Alex Rivera" },
      role: "owner" as const,
      current_issue: null,
    },
    {
      user: { id: "user-2", email: "sam@bugsense.dev", full_name: "Sam Patel" },
      role: "member" as const,
      current_issue: null,
    },
  ],
  member_count: 2,
};

describe("Dashboard / Insights Modular Components", () => {
  it("renders DashboardKpis with formatted metrics and completion rate", () => {
    render(<DashboardKpis overview={mockOverview} />);

    expect(screen.getByTestId("kpi-total")).toHaveTextContent("25");
    expect(screen.getByTestId("kpi-open")).toHaveTextContent("15");
    expect(screen.getByTestId("kpi-closed")).toHaveTextContent("10");
    expect(screen.getByTestId("kpi-overdue")).toHaveTextContent("3");
    expect(screen.getByTestId("kpi-avg-resolution")).toHaveTextContent("4.2d");
    expect(screen.getByText("40% completion rate")).toBeInTheDocument();
  });

  it("renders dash placeholder instead of 0d when no issues are resolved", () => {
    render(
      <DashboardKpis
        overview={{
          ...mockOverview,
          closed_issues: 0,
          avg_resolution_days: null,
        }}
      />
    );
    expect(screen.getByTestId("kpi-avg-resolution")).toHaveTextContent("–");
  });

  it("renders StatusDistributionChart with segmented status counts", () => {
    render(
      <StatusDistributionChart
        byStatus={mockOverview.by_status}
        totalIssues={mockOverview.total_issues}
      />
    );

    expect(screen.getByTestId("status-distribution")).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders SeverityPriorityBreakdown with all priority and severity levels", () => {
    render(
      <SeverityPriorityBreakdown
        byPriority={mockOverview.by_priority}
        bySeverity={mockOverview.by_severity}
        totalIssues={mockOverview.total_issues}
      />
    );

    expect(screen.getByTestId("severity-priority-breakdown")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders WorkloadChart with assigned and unassigned breakdown", () => {
    render(<WorkloadChart workload={mockWorkload} />);

    expect(screen.getByTestId("workload-chart")).toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Needs triage")).toBeInTheDocument();
  });

  it("renders ProjectAttentionCard with overdue and urgent counts", () => {
    render(
      <BrowserRouter>
        <AIInsightCard overview={mockOverview} />
      </BrowserRouter>
    );

    expect(screen.getByTestId("project-attention-card")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByTestId("overdue-attention-count")).toHaveTextContent("3");
  });
});

describe("TodayPage & InsightsPage Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    vi.spyOn(authHook, "useAuth").mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      startDemo: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [mockProject],
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    vi.spyOn(projectsHook, "useProjectToday").mockReturnValue({
      data: mockTodayData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsHook.useProjectToday>);

    vi.spyOn(analyticsHook, "useProjectOverview").mockReturnValue({
      data: mockOverview,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof analyticsHook.useProjectOverview>);

    vi.spyOn(analyticsHook, "useProjectTrends").mockReturnValue({
      data: mockTrends,
      isLoading: false,
    } as unknown as ReturnType<typeof analyticsHook.useProjectTrends>);

    vi.spyOn(analyticsHook, "useProjectWorkload").mockReturnValue({
      data: mockWorkload,
      isLoading: false,
    } as unknown as ReturnType<typeof analyticsHook.useProjectWorkload>);

    vi.spyOn(issuesHook, "useChangelog").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof issuesHook.useChangelog>);
  });

  const renderWithRouter = (node: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{node}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders TodayPage (DashboardPage) with Your work and Team pulse", () => {
    renderWithRouter(<DashboardPage />);

    expect(screen.getByTestId("today-page")).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Alex Rivera/i)).toBeInTheDocument();
    expect(screen.getByText("Fix Safari payment token crash")).toBeInTheDocument();
    expect(screen.getByText(/Team pulse/i)).toBeInTheDocument();
  });

  it("renders InsightsPage with KPIs, charts, and time range switcher", async () => {
    renderWithRouter(<InsightsPage />);

    expect(screen.getByTestId("insights-page")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-kpis")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-total")).toHaveTextContent("25");
    expect(screen.getByTestId("trends-chart")).toBeInTheDocument();
    expect(screen.getByText("Issue Activity Trends")).toBeInTheDocument();

    const btn7d = screen.getByTestId("range-btn-7");
    fireEvent.click(btn7d);
    await waitFor(() => {
      expect(btn7d).toHaveClass("bg-accent");
    });
  });

  it("renders first-time 4-step OnboardingFlow when user has no projects", () => {
    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    renderWithRouter(<DashboardPage />);

    expect(screen.getByText(/Create your first project/i)).toBeInTheDocument();
  });
});
