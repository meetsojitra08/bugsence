import { apiRequest } from "@/lib/apiClient";
import type {
  ProjectAnalyticsOverview,
  ProjectAnalyticsTrendPoint,
  ProjectAnalyticsWorkloadItem,
} from "../types";

export const analyticsApi = {
  async getOverview(projectId: string): Promise<ProjectAnalyticsOverview> {
    return apiRequest<ProjectAnalyticsOverview>(`/projects/${projectId}/analytics/overview/`);
  },

  async getTrends(projectId: string, days: number = 30): Promise<ProjectAnalyticsTrendPoint[]> {
    return apiRequest<ProjectAnalyticsTrendPoint[]>(`/projects/${projectId}/analytics/trends/`, {
      params: { days },
    });
  },

  async getWorkload(projectId: string): Promise<ProjectAnalyticsWorkloadItem[]> {
    return apiRequest<ProjectAnalyticsWorkloadItem[]>(`/projects/${projectId}/analytics/workload/`);
  },
};
