export type IssueStatus =
  | "inbox"
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "closed";

export type IssueSource = "manual" | "slack" | "email" | "sentry" | "public_form";

export type IssuePriority = "low" | "medium" | "high" | "urgent";

export type IssueSeverity = "trivial" | "minor" | "major" | "critical";

export type IssueType = "bug" | "feature" | "task" | "improvement";

export interface PullRequestLink {
  id: string;
  pr_number: number;
  title: string;
  url: string;
  branch: string;
  repo_full_name: string;
  state: "open" | "merged" | "closed";
  ci_status: "pending" | "success" | "failure" | "unknown";
  created_at: string;
  updated_at: string;
}

export interface IssueSummaryRef {
  id: string;
  number: number;
  key: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
}

export interface IssueChecklistItem {
  id: string;
  text: string;
  done: boolean;
  sub_issue_id?: string | null;
  sub_issue_key?: string | null;
}

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
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  type: IssueType;
  source?: IssueSource;
  reporter: IssueUser;
  assignee: IssueUser | null;
  external_reporter_name?: string;
  external_reporter_email?: string;
  labels: Label[];
  due_date: string | null;
  position: number;
  is_blocking_release?: boolean;
  snoozed_until?: string | null;
  resolved_at?: string | null;
  ai_metadata?: Record<string, unknown>;
  duplicate_of_id?: string | null;
  pull_requests?: PullRequestLink[];
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
  external_ref?: string;
  resolution_note?: string;
  checklist?: IssueChecklistItem[];
  ai_summary: string;
  ai_metadata: Record<string, unknown>;
  duplicate_of_id: string | null;
  duplicate_of?: IssueSummaryRef | null;
  parent_id?: string | null;
  parent?: IssueSummaryRef | null;
  sub_issues?: IssueSummaryRef[];
  comments_count?: number;
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
  source?: IssueSource;
  assignee_id?: string | null;
  label_ids?: string[];
  due_date?: string | null;
  external_reporter_name?: string;
  external_reporter_email?: string;
  is_blocking_release?: boolean;
  duplicate_of_id?: string | null;
  parent_id?: string | null;
  checklist?: IssueChecklistItem[];
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
  external_reporter_name?: string;
  external_reporter_email?: string;
  is_blocking_release?: boolean;
  duplicate_of_id?: string | null;
  parent_id?: string | null;
  checklist?: IssueChecklistItem[];
  resolution_note?: string;
  snoozed_until?: string | null;
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
  exclude_inbox?: boolean;
  recently_closed?: boolean;
  blocking?: boolean;
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

export interface SuggestedAssignee {
  id: string;
  full_name: string;
  email: string;
  reason: string;
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
  missing_info?: string[];
  suggested_assignee?: SuggestedAssignee | null;
}

export interface InboxTriagePayload {
  action: "accept" | "assign" | "merge" | "snooze" | "reject";
  assignee_id?: string | null;
  priority?: IssuePriority;
  target_issue_id?: string | null;
  snooze_hours?: number;
  reason?: string;
}

export interface BulkIssueActionPayload {
  issue_ids: string[];
  action: "assign" | "status" | "add_label" | "archive";
  assignee_id?: string | null;
  status?: IssueStatus;
  label_id?: string | null;
}

export interface ChangelogEntry {
  id: string;
  key: string;
  number: number;
  title: string;
  resolution_note: string;
  resolved_at: string;
  assignee: { full_name: string } | null;
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
