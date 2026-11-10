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
  overdue?: boolean;
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

export interface Comment {
  id: string;
  author: IssueUser;
  body: string;
  created_at: string;
  edited_at: string | null;
  is_edited: boolean;
}

export interface CreateCommentPayload {
  body: string;
}

export interface UpdateCommentPayload {
  body: string;
}

export interface TimelineItem {
  id: string;
  type: "activity" | "comment";
  actor: IssueUser;
  verb: string;
  field: string;
  old_value: string;
  new_value: string;
  body: string;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
}

export interface AITriageResult {
  title: string;
  type: IssueType;
  priority: IssuePriority;
  severity: IssueSeverity;
  steps_to_reproduce: string[];
  expected_behavior: string;
  actual_behavior: string;
  suggested_labels: string[];
  possible_root_cause: string;
  confidence: number;
  reasoning: string;
}

export interface AIDuplicateCandidate {
  id: string;
  number: number;
  key: string;
  title: string;
  status: IssueStatus;
  similarity: number;
}

export interface AISummaryResult {
  tldr: string;
  status: string;
  open_questions: string[];
  next_steps: string[];
  is_stale: boolean;
  generated_at: string | null;
}
