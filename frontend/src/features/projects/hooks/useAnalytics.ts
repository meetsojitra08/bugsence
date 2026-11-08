import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/analyticsApi";

export const ANALYTICS_KEYS = {
  all: ["analytics"] as const,
  overview: (projectId: string | null | undefined) =>
    ["analytics", projectId, "overview"] as const,
  trends: (projectId: string | null | undefined, days: number) =>
    ["analytics", projectId, "trends", days] as const,
  workload: (projectId: string | null | undefined) =>
    ["analytics", projectId, "workload"] as const,
};

export function useProjectOverview(projectId?: string | null) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.overview(projectId),
    queryFn: () =>
      projectId ? analyticsApi.getOverview(projectId) : Promise.reject(new Error("No project ID")),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useProjectTrends(projectId?: string | null, days: number = 30) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.trends(projectId, days),
    queryFn: () =>
      projectId
        ? analyticsApi.getTrends(projectId, days)
        : Promise.reject(new Error("No project ID")),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

export function useProjectWorkload(projectId?: string | null) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.workload(projectId),
    queryFn: () =>
      projectId ? analyticsApi.getWorkload(projectId) : Promise.reject(new Error("No project ID")),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}
