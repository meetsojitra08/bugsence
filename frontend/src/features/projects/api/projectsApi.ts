import { apiRequest } from "@/lib/apiClient";
import type {
  CreateProjectPayload,
  InviteMemberPayload,
  Project,
  ProjectMembership,
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
};
