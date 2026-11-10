import type { IssueListItem } from "@/features/issues/types";

export type ProjectRole = "owner" | "admin" | "member" | "viewer";

export interface ProjectMemberUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  last_active_at?: string | null;
}

export interface ProjectMembership {
  id: string;
  user: ProjectMemberUser;
  role: ProjectRole;
  open_issues_count?: number;
  last_active?: string | null;
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
  default_assignee_id?: string | null;
  default_assignee?: ProjectMemberUser | null;
  triage_rotation_enabled?: boolean;
  triage_rotation_cadence?: "daily" | "weekly";
  current_triager_id?: string | null;
  current_triager?: ProjectMemberUser | null;
  ai_auto_triage?: boolean;
  ai_confidence_threshold?: number;
  ai_priority_rules?: {
    default_priority?: string;
    urgent_keywords?: string[];
  };
  is_demo?: boolean;
  inbox_count?: number;
  total_issues_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  name: string;
  key?: string;
  description?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  archived?: boolean;
  default_assignee_id?: string | null;
  triage_rotation_enabled?: boolean;
  triage_rotation_cadence?: "daily" | "weekly";
  current_triager_id?: string | null;
  ai_auto_triage?: boolean;
  ai_confidence_threshold?: number;
  ai_priority_rules?: {
    default_priority?: string;
    urgent_keywords?: string[];
  };
}

export interface ProjectInvite {
  id: string;
  email: string;
  role: ProjectRole;
  token: string;
  status: "pending" | "accepted" | "revoked";
  invited_by: ProjectMemberUser | null;
  expires_at: string | null;
  is_expired: boolean;
  created_at: string;
}

export type IntegrationProvider = "github" | "slack" | "email_in" | "sentry" | "public_form";

export interface ProjectIntegration {
  id: string;
  provider: IntegrationProvider;
  enabled: boolean;
  config: Record<string, unknown>;
  webhook_secret: string;
  created_at: string;
  updated_at: string;
}

export interface TodaySummary {
  inbox_count: number;
  stale_inbox_count: number;
  assigned_to_you_count: number;
  blocking_release_count: number;
  total_issues: number;
  triager: { id: string; full_name: string; email: string } | null;
  is_current_user_triager: boolean;
}

export interface TodayData {
  summary: TodaySummary;
  your_work: IssueListItem[];
  waiting_on_you: {
    prs_awaiting_review: IssueListItem[];
    mentions: IssueListItem[];
    resolved_reported: IssueListItem[];
  };
  team_pulse: {
    user: { id: string; email: string; full_name: string; avatar_url?: string };
    role: ProjectRole;
    current_issue: IssueListItem | null;
  }[];
  member_count: number;
}

export interface InviteMemberPayload {
  email: string;
  role: ProjectRole;
}

export interface UpdateMemberRolePayload {
  role: ProjectRole;
}

export * from "./analytics";

