import { apiRequest } from "@/lib/apiClient";
import type {
  BoardData,
  Comment,
  CreateCommentPayload,
  CreateIssuePayload,
  IssueActivity,
  IssueDetail,
  IssueFilters,
  IssueListItem,
  Label,
  MoveIssuePayload,
  PaginatedIssues,
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
};
