import { apiRequest } from "@/lib/apiClient";
import type {
  CreateProjectPayload,
  IntegrationProvider,
  InviteMemberPayload,
  Project,
  ProjectIntegration,
  ProjectInvite,
  ProjectMembership,
  ProjectRole,
  TodayData,
  UpdateMemberRolePayload,
  UpdateProjectPayload,
} from "../types";

export const projectsApi = {
  async list(): Promise<Project[]> {
    const data = await apiRequest<Project[] | { results: Project[] }>("/projects/");
    return Array.isArray(data) ? data : (data.results ?? []);
  },

  async get(id: string): Promise<Project> {
    return apiRequest<Project>(`/projects/${id}/`);
  },

  async create(data: CreateProjectPayload): Promise<Project> {
    return apiRequest<Project>("/projects/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateProjectPayload): Promise<Project> {
    return apiRequest<Project>(`/projects/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/projects/${id}/`, { method: "DELETE" });
  },

  async listMembers(projectId: string): Promise<ProjectMembership[]> {
    return apiRequest<ProjectMembership[]>(`/projects/${projectId}/members/`);
  },

  async inviteMember(projectId: string, data: InviteMemberPayload): Promise<ProjectMembership> {
    return apiRequest<ProjectMembership>(`/projects/${projectId}/members/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateMemberRole(
    projectId: string,
    memberId: string,
    data: UpdateMemberRolePayload
  ): Promise<ProjectMembership> {
    return apiRequest<ProjectMembership>(`/projects/${projectId}/members/${memberId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await apiRequest<void>(`/projects/${projectId}/members/${memberId}/`, { method: "DELETE" });
  },

  async getToday(projectId: string): Promise<TodayData> {
    return apiRequest<TodayData>(`/projects/${projectId}/today/`);
  },

  async listInvites(projectId: string): Promise<ProjectInvite[]> {
    return apiRequest<ProjectInvite[]>(`/projects/${projectId}/invites/`);
  },

  async createInvite(
    projectId: string,
    payload: { email?: string; role: ProjectRole }
  ): Promise<ProjectInvite> {
    return apiRequest<ProjectInvite>(`/projects/${projectId}/invites/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resendInvite(projectId: string, inviteId: string): Promise<ProjectInvite> {
    return apiRequest<ProjectInvite>(`/projects/${projectId}/invites/${inviteId}/resend/`, {
      method: "POST",
    });
  },

  async revokeInvite(projectId: string, inviteId: string): Promise<void> {
    await apiRequest<void>(`/projects/${projectId}/invites/${inviteId}/`, { method: "DELETE" });
  },

  async getPublicInvite(token: string): Promise<{
    project_name: string;
    project_key: string;
    email: string;
    role: ProjectRole;
    status: string;
    invited_by: string;
  }> {
    return apiRequest(`/invites/${token}/`, { skipAuth: true });
  },

  async acceptInvite(token: string): Promise<{
    project_id: string;
    project_key: string;
    project_name: string;
    role: ProjectRole;
  }> {
    return apiRequest(`/invites/${token}/accept/`, { method: "POST" });
  },

  async listIntegrations(projectId: string): Promise<ProjectIntegration[]> {
    return apiRequest<ProjectIntegration[]>(`/projects/${projectId}/integrations/`);
  },

  async updateIntegration(
    projectId: string,
    provider: IntegrationProvider,
    payload: {
      enabled?: boolean;
      config?: Record<string, unknown>;
      regenerate_secret?: boolean;
    }
  ): Promise<ProjectIntegration> {
    return apiRequest<ProjectIntegration>(`/projects/${projectId}/integrations/${provider}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async testIntegration(
    projectId: string,
    provider: IntegrationProvider
  ): Promise<{ ok: boolean; provider: IntegrationProvider; message: string }> {
    return apiRequest<{ ok: boolean; provider: IntegrationProvider; message: string }>(
      `/projects/${projectId}/integrations/${provider}/test/`,
      { method: "POST" }
    );
  },
};
