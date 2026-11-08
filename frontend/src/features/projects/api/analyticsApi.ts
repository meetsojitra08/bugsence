import { apiRequest } from "@/lib/apiClient";
import type {
  ProjectAnalyticsOverview,
  ProjectAnalyticsTrendPoint,
  ProjectAnalyticsWorkloadItem,
} from "../types";

const isDemoSession = (): boolean => {
  return localStorage.getItem("bugsense_demo_mode") === "true";
};

const getDemoTrends = (days: number): ProjectAnalyticsTrendPoint[] => {
  const result: ProjectAnalyticsTrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      created: (i * 3 + 2) % 5,
      resolved: (i * 2 + 1) % 4,
    });
  }
  return result;
};

const DEMO_OVERVIEW: ProjectAnalyticsOverview = {
  total_issues: 24,
  open_issues: 14,
  closed_issues: 10,
  overdue_issues: 2,
  avg_resolution_days: 3.4,
  by_status: {
    backlog: 4,
    todo: 5,
    in_progress: 3,
    in_review: 2,
    done: 8,
    closed: 2,
  },
  by_priority: {
    urgent: 3,
    high: 6,
    medium: 10,
    low: 5,
  },
  by_severity: {
    critical: 2,
    major: 5,
    minor: 11,
    trivial: 6,
  },
};

const DEMO_WORKLOAD: ProjectAnalyticsWorkloadItem[] = [
  {
    user: {
      id: "demo-user-id",
      email: "demo@bugsense.dev",
      full_name: "Demo Recruiter",
      avatar_url: undefined,
    },
    count: 6,
    by_priority: { urgent: 2, high: 2, medium: 2, low: 0 },
  },
  {
    user: {
      id: "sarah-user-id",
      email: "sarah.chen@bugsense.dev",
      full_name: "Sarah Chen",
      avatar_url: undefined,
    },
    count: 5,
    by_priority: { urgent: 1, high: 2, medium: 1, low: 1 },
  },
  {
    user: {
      id: "marcus-user-id",
      email: "marcus.vance@bugsense.dev",
      full_name: "Marcus Vance",
      avatar_url: undefined,
    },
    count: 3,
    by_priority: { urgent: 0, high: 2, medium: 1, low: 0 },
  },
  {
    user: null,
    count: 2,
    by_priority: { urgent: 0, high: 0, medium: 2, low: 0 },
  },
];

export const analyticsApi = {
  async getOverview(projectId: string): Promise<ProjectAnalyticsOverview> {
    if (isDemoSession()) {
      return DEMO_OVERVIEW;
    }
    return apiRequest<ProjectAnalyticsOverview>(`/projects/${projectId}/analytics/overview/`);
  },

  async getTrends(projectId: string, days: number = 30): Promise<ProjectAnalyticsTrendPoint[]> {
    if (isDemoSession()) {
      return getDemoTrends(days);
    }
    return apiRequest<ProjectAnalyticsTrendPoint[]>(`/projects/${projectId}/analytics/trends/`, {
      params: { days },
    });
  },

  async getWorkload(projectId: string): Promise<ProjectAnalyticsWorkloadItem[]> {
    if (isDemoSession()) {
      return DEMO_WORKLOAD;
    }
    return apiRequest<ProjectAnalyticsWorkloadItem[]>(`/projects/${projectId}/analytics/workload/`);
  },
};
