import { apiRequest } from "@/lib/apiClient";
import type {
  BoardData,
  BulkIssueActionPayload,
  ChangelogEntry,
  Comment,
  CreateCommentPayload,
  CreateIssuePayload,
  InboxTriagePayload,
  IssueActivity,
  IssueDetail,
  IssueFilters,
  IssueListItem,
  Label,
  MoveIssuePayload,
  PaginatedIssues,
  PullRequestLink,
  TimelineItem,
  UpdateCommentPayload,
  UpdateIssuePayload,
} from "../types";

function buildQuery(filters?: IssueFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const issuesApi = {
  async list(projectId: string, filters?: IssueFilters): Promise<PaginatedIssues> {
    const data = await apiRequest<PaginatedIssues | IssueListItem[]>(
      `/projects/${projectId}/issues/${buildQuery(filters)}`
    );
    if (!Array.isArray(data)) return data;
    return {
      count: data.length,
      total_pages: 1,
      current_page: 1,
      next: null,
      previous: null,
      results: data,
    };
  },

  async get(issueId: string): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/issues/${issueId}/`);
  },

  async getByProjectAndNumber(projectIdentifier: string, number: number): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/projects/${projectIdentifier}/issues/${number}/`);
  },

  async create(projectId: string, payload: CreateIssuePayload): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/projects/${projectId}/issues/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(issueId: string, payload: UpdateIssuePayload): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/issues/${issueId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async delete(issueId: string): Promise<void> {
    await apiRequest<void>(`/issues/${issueId}/`, { method: "DELETE" });
  },

  async restore(issueId: string): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/issues/${issueId}/restore/`, { method: "POST" });
  },

  async listLabels(projectId: string): Promise<Label[]> {
    return apiRequest<Label[]>(`/projects/${projectId}/labels/`);
  },

  async createLabel(
    projectId: string,
    payload: { name: string; color: string; description?: string }
  ): Promise<Label> {
    return apiRequest<Label>(`/projects/${projectId}/labels/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteLabel(labelId: string): Promise<void> {
    await apiRequest<void>(`/labels/${labelId}/`, { method: "DELETE" });
  },

  async listActivities(issueId: string): Promise<IssueActivity[]> {
    return apiRequest<IssueActivity[]>(`/issues/${issueId}/activity/`);
  },

  async getBoard(projectId: string, filters?: IssueFilters): Promise<BoardData> {
    return apiRequest<BoardData>(`/projects/${projectId}/board/${buildQuery(filters)}`);
  },

  async move(issueId: string, payload: MoveIssuePayload): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/issues/${issueId}/move/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listComments(issueId: string): Promise<Comment[]> {
    return apiRequest<Comment[]>(`/issues/${issueId}/comments/`);
  },

  async createComment(issueId: string, payload: CreateCommentPayload): Promise<Comment> {
    return apiRequest<Comment>(`/issues/${issueId}/comments/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateComment(commentId: string, payload: UpdateCommentPayload): Promise<Comment> {
    return apiRequest<Comment>(`/comments/${commentId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiRequest<void>(`/comments/${commentId}/`, { method: "DELETE" });
  },

  async getTimeline(issueId: string): Promise<TimelineItem[]> {
    return apiRequest<TimelineItem[]>(`/issues/${issueId}/activity/`);
  },

  async getTimelineByNumber(projectIdentifier: string, number: number): Promise<TimelineItem[]> {
    return apiRequest<TimelineItem[]>(`/projects/${projectIdentifier}/issues/${number}/activity/`);
  },

  async listInbox(projectId: string, includeSnoozed = false): Promise<IssueListItem[]> {
    const q = includeSnoozed ? "?include_snoozed=true" : "";
    return apiRequest<IssueListItem[]>(`/projects/${projectId}/inbox/${q}`);
  },

  async triageInbox(issueId: string, payload: InboxTriagePayload): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/issues/${issueId}/triage/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resolve(
    issueId: string,
    payload: { resolution_note: string; notify_reporter?: boolean }
  ): Promise<IssueDetail> {
    return apiRequest<IssueDetail>(`/issues/${issueId}/resolve/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async convertChecklistItem(
    issueId: string,
    itemId: string
  ): Promise<{ parent: IssueDetail; sub_issue: IssueDetail }> {
    return apiRequest<{ parent: IssueDetail; sub_issue: IssueDetail }>(
      `/issues/${issueId}/checklist/convert/`,
      {
        method: "POST",
        body: JSON.stringify({ item_id: itemId }),
      }
    );
  },

  async bulkAction(
    projectId: string,
    payload: BulkIssueActionPayload
  ): Promise<{ updated_count: number }> {
    return apiRequest<{ updated_count: number }>(`/projects/${projectId}/issues/bulk/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async linkPullRequest(
    issueId: string,
    payload: {
      pr_number: number;
      title?: string;
      url: string;
      branch?: string;
      repo_full_name?: string;
      state?: "open" | "merged" | "closed";
      ci_status?: "pending" | "success" | "failure" | "unknown";
    }
  ): Promise<PullRequestLink> {
    return apiRequest<PullRequestLink>(`/issues/${issueId}/pull-requests/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listChangelog(projectId: string): Promise<ChangelogEntry[]> {
    return apiRequest<ChangelogEntry[]>(`/projects/${projectId}/changelog/`);
  },

  async uploadAttachment(
    projectId: string,
    file: File,
    issueId?: string
  ): Promise<{ id: string; filename: string; url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (issueId) formData.append("issue_id", issueId);
    return apiRequest<{ id: string; filename: string; url: string }>(
      `/projects/${projectId}/attachments/`,
      {
        method: "POST",
        body: formData,
      }
    );
  },
};
