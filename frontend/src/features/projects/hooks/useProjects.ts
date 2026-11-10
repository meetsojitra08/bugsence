import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projectsApi";
import type {
  CreateProjectPayload,
  InviteMemberPayload,
  UpdateMemberRolePayload,
  UpdateProjectPayload,
} from "../types";

export const PROJECT_KEYS = {
  all: ["projects"] as const,
  detail: (id: string | null) => ["projects", id] as const,
  members: (projectId: string | null) => ["projects", projectId, "members"] as const,
  invites: (projectId: string | null) => ["projects", projectId, "invites"] as const,
  integrations: (projectId: string | null) => ["projects", projectId, "integrations"] as const,
  today: (projectId: string | null) => ["projects", projectId, "today"] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: PROJECT_KEYS.all,
    queryFn: () => projectsApi.list(),
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(projectId),
    queryFn: () => (projectId ? projectsApi.get(projectId) : Promise.reject(new Error("No ID"))),
    enabled: Boolean(projectId),
  });
}

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: PROJECT_KEYS.members(projectId),
    queryFn: () =>
      projectId ? projectsApi.listMembers(projectId) : Promise.reject(new Error("No ID")),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectPayload) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProjectPayload) => projectsApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

export function useInviteMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberPayload) => projectsApi.inviteMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.members(projectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateMemberRolePayload }) =>
      projectsApi.updateMemberRole(projectId, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.members(projectId) });
    },
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => projectsApi.removeMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.members(projectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

export function useProjectToday(projectId: string | null) {
  return useQuery({
    queryKey: PROJECT_KEYS.today(projectId),
    queryFn: () =>
      projectId ? projectsApi.getToday(projectId) : Promise.reject(new Error("No project ID")),
    enabled: Boolean(projectId),
  });
}

export function useProjectInvites(projectId: string | null) {
  return useQuery({
    queryKey: PROJECT_KEYS.invites(projectId),
    queryFn: () =>
      projectId ? projectsApi.listInvites(projectId) : Promise.reject(new Error("No project ID")),
    enabled: Boolean(projectId),
  });
}

export function useProjectIntegrations(projectId: string | null) {
  return useQuery({
    queryKey: PROJECT_KEYS.integrations(projectId),
    queryFn: () =>
      projectId
        ? projectsApi.listIntegrations(projectId)
        : Promise.reject(new Error("No project ID")),
    enabled: Boolean(projectId),
  });
}
