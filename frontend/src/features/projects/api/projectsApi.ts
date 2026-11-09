import { apiRequest } from "@/lib/apiClient";
import { isDemoSession } from "@/lib/demo";
import type {
  CreateProjectPayload,
  InviteMemberPayload,
  Project,
  ProjectMembership,
  UpdateMemberRolePayload,
  UpdateProjectPayload,
} from "../types";

const DEMO_PROJECTS: Project[] = [
  {
    id: "demo-project-1",
    name: "BugSense Web App",
    key: "BUG",
    description: "Main web application and cloud services frontend.",
    owner_id: "demo-user-id",
    archived: false,
    my_role: "owner",
    members_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-project-2",
    name: "Mobile Client App",
    key: "MOB",
    description: "Cross-platform mobile application built with React Native.",
    owner_id: "colleague-id",
    archived: false,
    my_role: "admin",
    members_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_MEMBERS: Record<string, ProjectMembership[]> = {
  "demo-project-1": [
    {
      id: "mem-1",
      user: {
        id: "demo-user-id",
        email: "demo@bugsense.dev",
        full_name: "Demo Recruiter",
      },
      role: "owner",
      created_at: new Date().toISOString(),
    },
    {
      id: "mem-2",
      user: {
        id: "sarah-user-id",
        email: "sarah.chen@bugsense.dev",
        full_name: "Sarah Chen",
      },
      role: "admin",
      created_at: new Date().toISOString(),
    },
    {
      id: "mem-3",
      user: {
        id: "marcus-user-id",
        email: "marcus.vance@bugsense.dev",
        full_name: "Marcus Vance",
      },
      role: "member",
      created_at: new Date().toISOString(),
    },
  ],
  "demo-project-2": [
    {
      id: "mem-4",
      user: {
        id: "colleague-id",
        email: "lead@bugsense.dev",
        full_name: "Elena Rostova",
      },
      role: "owner",
      created_at: new Date().toISOString(),
    },
    {
      id: "mem-5",
      user: {
        id: "demo-user-id",
        email: "demo@bugsense.dev",
        full_name: "Demo Recruiter",
      },
      role: "admin",
      created_at: new Date().toISOString(),
    },
  ],
};

export const projectsApi = {
  async list(): Promise<Project[]> {
    if (isDemoSession()) {
      return [...DEMO_PROJECTS];
    }
    const data = await apiRequest<Project[] | { results: Project[] }>("/projects/");
    if (Array.isArray(data)) {
      return data;
    }
    return data.results || [];
  },

  async get(id: string): Promise<Project> {
    if (isDemoSession()) {
      const found = DEMO_PROJECTS.find((p) => p.id === id);
      if (found) return found;
      return DEMO_PROJECTS[0];
    }
    return apiRequest<Project>(`/projects/${id}/`);
  },

  async create(data: CreateProjectPayload): Promise<Project> {
    if (isDemoSession()) {
      const newProj: Project = {
        id: `demo-project-${Date.now()}`,
        name: data.name,
        key: data.key.toUpperCase(),
        description: data.description || "",
        owner_id: "demo-user-id",
        archived: false,
        my_role: "owner",
        members_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      DEMO_PROJECTS.unshift(newProj);
      return newProj;
    }
    return apiRequest<Project>("/projects/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateProjectPayload): Promise<Project> {
    if (isDemoSession()) {
      const idx = DEMO_PROJECTS.findIndex((p) => p.id === id);
      if (idx !== -1) {
        DEMO_PROJECTS[idx] = {
          ...DEMO_PROJECTS[idx],
          ...data,
          updated_at: new Date().toISOString(),
        };
        return DEMO_PROJECTS[idx];
      }
    }
    return apiRequest<Project>(`/projects/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    if (isDemoSession()) {
      const idx = DEMO_PROJECTS.findIndex((p) => p.id === id);
      if (idx !== -1) {
        DEMO_PROJECTS.splice(idx, 1);
      }
      return;
    }
    await apiRequest<void>(`/projects/${id}/`, {
      method: "DELETE",
    });
  },

  async listMembers(projectId: string): Promise<ProjectMembership[]> {
    if (isDemoSession()) {
      return DEMO_MEMBERS[projectId] || [];
    }
    return apiRequest<ProjectMembership[]>(`/projects/${projectId}/members/`);
  },

  async inviteMember(projectId: string, data: InviteMemberPayload): Promise<ProjectMembership> {
    if (isDemoSession()) {
      const newMem: ProjectMembership = {
        id: `mem-${Date.now()}`,
        user: {
          id: `user-${Date.now()}`,
          email: data.email,
          full_name: data.email.split("@")[0],
        },
        role: data.role,
        created_at: new Date().toISOString(),
      };
      if (!DEMO_MEMBERS[projectId]) {
        DEMO_MEMBERS[projectId] = [];
      }
      DEMO_MEMBERS[projectId].push(newMem);
      return newMem;
    }
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
    if (isDemoSession()) {
      const list = DEMO_MEMBERS[projectId] || [];
      const mem = list.find((m) => m.id === memberId);
      if (mem) {
        mem.role = data.role;
        return mem;
      }
    }
    return apiRequest<ProjectMembership>(`/projects/${projectId}/members/${memberId}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async removeMember(projectId: string, memberId: string): Promise<void> {
    if (isDemoSession()) {
      const list = DEMO_MEMBERS[projectId] || [];
      const idx = list.findIndex((m) => m.id === memberId);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
      return;
    }
    await apiRequest<void>(`/projects/${projectId}/members/${memberId}/`, {
      method: "DELETE",
    });
  },
};
