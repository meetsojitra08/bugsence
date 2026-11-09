import { apiRequest } from "@/lib/apiClient";
import { isDemoSession } from "@/lib/demo";
import type {
  ProjectAnalyticsOverview,
  ProjectAnalyticsTrendPoint,
  ProjectAnalyticsWorkloadItem,
} from "../types";

function distribute(total: number, days: number, phase: number): number[] {
  if (days <= 0) return [];
  const weights = Array.from({ length: days }, (_, index) => {
    const wave = 0.55 + 0.45 * Math.sin((index + phase) / 2.7);
    const bump = index % 9 === 0 ? 0.4 : 0;
    return wave + bump;
  });
  const sum = weights.reduce((acc, value) => acc + value, 0) || 1;
  const raw = weights.map((weight) => (total * weight) / sum);
  const values = raw.map((value) => Math.floor(value));
  let remainder = total - values.reduce((acc, value) => acc + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    values[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return values;
}

const getDemoTrends = (days: number): ProjectAnalyticsTrendPoint[] => {
  const [createdTotal, resolvedTotal] = days === 7 ? [7, 2] : [24, 10];

  const created = distribute(createdTotal, days, 1.4);
  const resolved = distribute(resolvedTotal, days, 3.1);

  const result: ProjectAnalyticsTrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const index = days - 1 - i;
    result.push({
      date: date.toISOString().split("T")[0],
      created: created[index] ?? 0,
      resolved: resolved[index] ?? 0,
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
    count: 5,
    by_priority: { urgent: 2, high: 1, medium: 2, low: 0 },
  },
  {
    user: {
      id: "sarah-user-id",
      email: "sarah.chen@bugsense.dev",
      full_name: "Sarah Chen",
      avatar_url: undefined,
    },
    count: 4,
    by_priority: { urgent: 1, high: 1, medium: 1, low: 1 },
  },
  {
    user: {
      id: "marcus-user-id",
      email: "marcus.vance@bugsense.dev",
      full_name: "Marcus Vance",
      avatar_url: undefined,
    },
    count: 3,
    by_priority: { urgent: 0, high: 1, medium: 2, low: 0 },
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
