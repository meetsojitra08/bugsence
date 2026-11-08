export type IssueStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "closed";

export type IssuePriority = "low" | "medium" | "high" | "urgent";

export type IssueSeverity = "trivial" | "minor" | "major" | "critical";

export type IssueType = "bug" | "feature" | "task" | "improvement";

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface IssueUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface IssueListItem {
  id: string;
  number: number;
  key: string;
  project_key: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  type: IssueType;
  reporter: IssueUser;
  assignee: IssueUser | null;
  labels: Label[];
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface IssueDetail extends IssueListItem {
  project_id: string;
  project_name: string;
  description: string;
  steps_to_reproduce: string;
  expected: string;
  actual: string;
  environment: string;
  ai_summary: string;
  ai_metadata: Record<string, unknown>;
  duplicate_of_id: string | null;
}

export interface CreateIssuePayload {
  title: string;
  description?: string;
  steps_to_reproduce?: string;
  expected?: string;
  actual?: string;
  environment?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  severity?: IssueSeverity;
  type?: IssueType;
  assignee_id?: string | null;
  label_ids?: string[];
  due_date?: string | null;
}

export interface UpdateIssuePayload {
  title?: string;
  description?: string;
  steps_to_reproduce?: string;
  expected?: string;
  actual?: string;
  environment?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  severity?: IssueSeverity;
  type?: IssueType;
  assignee_id?: string | null;
  label_ids?: string[];
  due_date?: string | null;
  position?: number;
}

export interface IssueActivity {
  id: string;
  actor: IssueUser | null;
  verb: string;
  field: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export interface IssueFilters {
  status?: string;
  priority?: string;
  severity?: string;
  type?: string;
  assignee?: string;
  label?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedIssues {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: IssueListItem[];
}

export interface MoveIssuePayload {
  status: IssueStatus;
  before_id?: string | null;
  after_id?: string | null;
}

export interface BoardData {
  columns: Record<IssueStatus, IssueListItem[]>;
  counts: Record<IssueStatus, number>;
}
