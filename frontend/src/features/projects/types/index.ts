export type ProjectRole = "owner" | "admin" | "member" | "viewer";

export interface ProjectMemberUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface ProjectMembership {
  id: string;
  user: ProjectMemberUser;
  role: ProjectRole;
  created_at: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  owner_id: string;
  archived: boolean;
  my_role?: ProjectRole;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  name: string;
  key: string;
  description?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  archived?: boolean;
}

export interface InviteMemberPayload {
  email: string;
  role: ProjectRole;
}

export interface UpdateMemberRolePayload {
  role: ProjectRole;
}
