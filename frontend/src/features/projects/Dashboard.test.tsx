import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { analyticsApi } from "./api/analyticsApi";
import { DashboardPage } from "../dashboard/DashboardPage";
import { DashboardKpis } from "../dashboard/components/DashboardKpis";
import { StatusDistributionChart } from "../dashboard/components/StatusDistributionChart";
import { SeverityPriorityBreakdown } from "../dashboard/components/SeverityPriorityBreakdown";
import { WorkloadChart } from "../dashboard/components/WorkloadChart";
import { AIInsightCard } from "../dashboard/components/AIInsightCard";
import * as authHook from "@/features/auth/hooks/useAuth";
import * as projectsHook from "@/features/projects/hooks/useProjects";
import * as analyticsHook from "@/features/projects/hooks/useAnalytics";

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

describe("Analytics API Client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns demo overview data when in demo mode", async () => {
    localStorage.setItem("bugsense_demo_mode", "true");
    const overview = await analyticsApi.getOverview("any-id");
    expect(overview).toBeDefined();
    expect(overview.total_issues).toBe(24);
    expect(overview.open_issues).toBe(14);
  });

  it("returns demo trends sequence when in demo mode", async () => {
    localStorage.setItem("bugsense_demo_mode", "true");
    const trends = await analyticsApi.getTrends("any-id", 7);
    expect(trends).toHaveLength(7);
    expect(trends[0]).toHaveProperty("date");
    expect(trends[0]).toHaveProperty("created");
    expect(trends[0]).toHaveProperty("resolved");
  });

  it("returns demo workload distribution when in demo mode", async () => {
    localStorage.setItem("bugsense_demo_mode", "true");
    const workload = await analyticsApi.getWorkload("any-id");
    expect(workload.length).toBeGreaterThan(0);
    expect(workload[0].user?.email).toBe("demo@bugsense.dev");
  });
});

describe("Dashboard Modular Components", () => {
  it("renders DashboardKpis with formatted metrics and completion rate", () => {
    render(<DashboardKpis overview={mockOverview} />);

    expect(screen.getByTestId("kpi-total")).toHaveTextContent("25");
    expect(screen.getByTestId("kpi-open")).toHaveTextContent("15");
    expect(screen.getByTestId("kpi-closed")).toHaveTextContent("10");
    expect(screen.getByTestId("kpi-overdue")).toHaveTextContent("3");
    expect(screen.getByTestId("kpi-avg-resolution")).toHaveTextContent("4.2d");
    expect(screen.getByText("40% completion rate")).toBeInTheDocument();
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

  it("renders AIInsightCard with context-aware analysis", () => {
    render(<AIInsightCard overview={mockOverview} />);

    expect(screen.getByTestId("ai-insight-card")).toBeInTheDocument();
    expect(screen.getByText("Workspace Health Pulse")).toBeInTheDocument();
    expect(screen.getByText(/3 issues are currently overdue/i)).toBeInTheDocument();
  });
});

describe("DashboardPage Full Integration", () => {
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
      logout: vi.fn(),
      loginAsDemo: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [mockProject],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    vi.spyOn(analyticsHook, "useProjectOverview").mockReturnValue({
      data: mockOverview,
      isLoading: false,
    } as unknown as ReturnType<typeof analyticsHook.useProjectOverview>);

    vi.spyOn(analyticsHook, "useProjectTrends").mockReturnValue({
      data: mockTrends,
      isLoading: false,
    } as unknown as ReturnType<typeof analyticsHook.useProjectTrends>);

    vi.spyOn(analyticsHook, "useProjectWorkload").mockReturnValue({
      data: mockWorkload,
      isLoading: false,
    } as unknown as ReturnType<typeof analyticsHook.useProjectWorkload>);
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("renders dashboard page with active project, KPIs, charts and AI pulse", async () => {
    renderDashboard();

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Alex Rivera/i)).toBeInTheDocument();
    expect(screen.getAllByText("BugSense Core").length).toBeGreaterThan(0);

    // KPIs
    expect(screen.getByTestId("dashboard-kpis")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-total")).toHaveTextContent("25");

    // Trends Chart
    expect(screen.getByTestId("trends-chart")).toBeInTheDocument();
    expect(screen.getByText("Issue Activity Trends")).toBeInTheDocument();

    // Range selector buttons
    const btn7d = screen.getByTestId("range-btn-7");
    fireEvent.click(btn7d);
    await waitFor(() => {
      expect(btn7d).toHaveClass("bg-accent");
    });
  });

  it("renders first-time empty state when user has no projects", () => {
    vi.spyOn(projectsHook, "useProjects").mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof projectsHook.useProjects>);

    renderDashboard();

    expect(screen.getByText(/Create Your First Project/i)).toBeInTheDocument();
  });
});
