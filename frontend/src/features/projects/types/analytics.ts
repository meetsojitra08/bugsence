export interface ProjectAnalyticsOverview {
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  overdue_issues: number;
  avg_resolution_days: number | null;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface ProjectAnalyticsTrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface ProjectAnalyticsWorkloadItem {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  count: number;
  by_priority: Record<string, number>;
}
