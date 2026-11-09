export type NotificationKind =
  | "assigned"
  | "mentioned"
  | "mention"
  | "status_changed"
  | "comment_created"
  | "comment";

export interface NotificationActor {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface NotificationIssue {
  id: string;
  number: number;
  key: string;
  title: string;
  project_key: string;
  status: string;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  actor: NotificationActor | null;
  issue: NotificationIssue | null;
  comment_id?: string | null;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationUnreadCountResponse {
  count: number;
}
