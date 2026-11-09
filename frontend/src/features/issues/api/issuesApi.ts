import { apiRequest } from "@/lib/apiClient";
import { isDemoSession } from "@/lib/demo";
import type {
  BoardData,
  Comment,
  CreateCommentPayload,
  CreateIssuePayload,
  IssueActivity,
  IssueDetail,
  IssueFilters,
  IssueListItem,
  IssueStatus,
  Label,
  MoveIssuePayload,
  PaginatedIssues,
  TimelineItem,
  UpdateCommentPayload,
  UpdateIssuePayload,
} from "../types";

const DEMO_LABELS: Label[] = [
  { id: "lbl-1", name: "Frontend", color: "#3B82F6", description: "UI, styling and UX bugs" },
  { id: "lbl-2", name: "Backend", color: "#10B981", description: "API and DB issues" },
  { id: "lbl-3", name: "Security", color: "#EF4444", description: "Auth and security alerts" },
  { id: "lbl-4", name: "Performance", color: "#F59E0B", description: "Latency and profiling" },
];

const DEMO_ISSUES: IssueDetail[] = [
  {
    id: "demo-issue-1",
    number: 1,
    key: "BUG-1",
    project_id: "demo-project-1",
    project_key: "BUG",
    project_name: "BugSense Web App",
    title: "Silent token rotation failure on cross-tab session expiry",
    description:
      "When multiple tabs are open, concurrent refresh requests invalidate each other's refresh tokens.",
    steps_to_reproduce:
      "1. Open app in two browser tabs.\n2. Wait for access token expiry.\n3. Trigger simultaneous API requests.",
    expected: "Shared mutex refreshes token once and informs both tabs.",
    actual: "Second tab receives 401 and gets logged out unexpectedly.",
    environment: "Chrome 122 / macOS 14.3",
    status: "in_progress",
    priority: "urgent",
    severity: "critical",
    type: "bug",
    reporter: {
      id: "demo-user-id",
      email: "demo@bugsense.dev",
      full_name: "Demo Recruiter",
    },
    assignee: {
      id: "sarah-user-id",
      email: "sarah.chen@bugsense.dev",
      full_name: "Sarah Chen",
    },
    labels: [DEMO_LABELS[1], DEMO_LABELS[2]],
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    position: 65536.0,
    ai_summary: "Race condition in refresh token rotation across multi-tab clients.",
    ai_metadata: {},
    duplicate_of_id: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-issue-2",
    number: 2,
    key: "BUG-2",
    project_id: "demo-project-1",
    project_key: "BUG",
    project_name: "BugSense Web App",
    title: "Command palette keyboard shortcut 'C' clashes inside input fields",
    description:
      "Typing 'c' into an input field triggers the create issue modal when event propagation isn't stopped.",
    steps_to_reproduce: "1. Focus search input.\n2. Type lowercase letter 'c'.",
    expected: "Character 'c' is typed without opening modal.",
    actual: "Create issue modal pops up and interrupts typing.",
    environment: "All platforms / Web",
    status: "todo",
    priority: "high",
    severity: "minor",
    type: "bug",
    reporter: {
      id: "marcus-user-id",
      email: "marcus.vance@bugsense.dev",
      full_name: "Marcus Vance",
    },
    assignee: {
      id: "demo-user-id",
      email: "demo@bugsense.dev",
      full_name: "Demo Recruiter",
    },
    labels: [DEMO_LABELS[0]],
    due_date: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
    position: 131072.0,
    ai_summary: "Keyboard listener target validation needed for input elements.",
    ai_metadata: {},
    duplicate_of_id: null,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-issue-3",
    number: 3,
    key: "BUG-3",
    project_id: "demo-project-1",
    project_key: "BUG",
    project_name: "BugSense Web App",
    title: "Add pgvector cosine similarity index for automated duplicate detection",
    description:
      "Prepare schema and embeddings vector search for Phase 4 AI duplicate detection pipeline.",
    steps_to_reproduce: "N/A - Feature improvement task.",
    expected: "Vector index ivfflat or hnsw deployed on issues table.",
    actual: "Embeddings stored as raw arrays without index.",
    environment: "PostgreSQL 16 pgvector",
    status: "in_review",
    priority: "medium",
    severity: "minor",
    type: "feature",
    reporter: {
      id: "demo-user-id",
      email: "demo@bugsense.dev",
      full_name: "Demo Recruiter",
    },
    assignee: {
      id: "sarah-user-id",
      email: "sarah.chen@bugsense.dev",
      full_name: "Sarah Chen",
    },
    labels: [DEMO_LABELS[1], DEMO_LABELS[3]],
    due_date: null,
    position: 196608.0,
    ai_summary: "Infrastructure setup for pgvector duplicate clustering.",
    ai_metadata: {},
    duplicate_of_id: null,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-issue-4",
    number: 4,
    key: "BUG-4",
    project_id: "demo-project-1",
    project_key: "BUG",
    project_name: "BugSense Web App",
    title: "Implement dark mode OLED contrast adjustments",
    description: "Zinc 950 backgrounds need deeper contrast on high dynamic range displays.",
    steps_to_reproduce: "1. Switch to dark mode.\n2. Inspect border dividers.",
    expected: "Crisp 1px border contrast.",
    actual: "Border blends with background on some panels.",
    environment: "Tailwind CSS / OLED Displays",
    status: "done",
    priority: "low",
    severity: "trivial",
    type: "improvement",
    reporter: {
      id: "marcus-user-id",
      email: "marcus.vance@bugsense.dev",
      full_name: "Marcus Vance",
    },
    assignee: null,
    labels: [DEMO_LABELS[0]],
    due_date: null,
    position: 262144.0,
    ai_summary: "Visual styling refinement for dark mode.",
    ai_metadata: {},
    duplicate_of_id: null,
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEMO_ACTIVITIES: Record<string, IssueActivity[]> = {
  "demo-issue-1": [
    {
      id: "act-1",
      actor: {
        id: "demo-user-id",
        email: "demo@bugsense.dev",
        full_name: "Demo Recruiter",
      },
      verb: "created",
      field: "",
      old_value: "",
      new_value: "Silent token rotation failure on cross-tab session expiry",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "act-2",
      actor: {
        id: "demo-user-id",
        email: "demo@bugsense.dev",
        full_name: "Demo Recruiter",
      },
      verb: "assigned",
      field: "assignee",
      old_value: "",
      new_value: "sarah.chen@bugsense.dev",
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    },
    {
      id: "act-3",
      actor: {
        id: "sarah-user-id",
        email: "sarah.chen@bugsense.dev",
        full_name: "Sarah Chen",
      },
      verb: "status_changed",
      field: "status",
      old_value: "todo",
      new_value: "in_progress",
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
  ],
};

const DEMO_COMMENTS: Record<string, Comment[]> = {
  "demo-issue-1": [
    {
      id: "comm-1",
      author: {
        id: "sarah-user-id",
        email: "sarah.chen@bugsense.dev",
        full_name: "Sarah Chen",
      },
      body: "I was able to reproduce this when opening three tabs simultaneously with expired refresh cookies. Investigating the axios retry interceptor lock.",
      created_at: new Date(Date.now() - 3600000 * 16).toISOString(),
      edited_at: null,
      is_edited: false,
    },
    {
      id: "comm-2",
      author: {
        id: "demo-user-id",
        email: "demo@bugsense.dev",
        full_name: "Demo Recruiter",
      },
      body: "Thanks @sarah.chen! Let's prioritize getting this fix into the current sprint.",
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      edited_at: null,
      is_edited: false,
    },
  ],
};

export const issuesApi = {
  async list(projectId: string, filters?: IssueFilters): Promise<PaginatedIssues> {
    if (isDemoSession()) {
      let filtered = [...DEMO_ISSUES];

      if (filters?.status) {
        const statuses = filters.status.split(",").map((s) => s.trim().toLowerCase());
        filtered = filtered.filter((i) => statuses.includes(i.status.toLowerCase()));
      }
      if (filters?.priority) {
        const priorities = filters.priority.split(",").map((p) => p.trim().toLowerCase());
        filtered = filtered.filter((i) => priorities.includes(i.priority.toLowerCase()));
      }
      if (filters?.assignee) {
        if (filters.assignee === "unassigned") {
          filtered = filtered.filter((i) => !i.assignee);
        } else {
          filtered = filtered.filter((i) => i.assignee?.id === filters.assignee);
        }
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            String(i.number).includes(q) ||
            i.key.toLowerCase().includes(q)
        );
      }
      if (filters?.label) {
        filtered = filtered.filter((i) =>
          i.labels.some((l) => l.name.toLowerCase() === filters.label?.toLowerCase())
        );
      }

      return {
        count: filtered.length,
        total_pages: 1,
        current_page: 1,
        next: null,
        previous: null,
        results: filtered,
      };
    }

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });
    }

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const data = await apiRequest<PaginatedIssues | IssueListItem[]>(
      `/projects/${projectId}/issues/${queryStr}`
    );

    if (Array.isArray(data)) {
      return {
        count: data.length,
        total_pages: 1,
        current_page: 1,
        next: null,
        previous: null,
        results: data,
      };
    }

    return data;
  },

  async get(issueId: string): Promise<IssueDetail> {
    if (isDemoSession()) {
      const issue = DEMO_ISSUES.find((i) => i.id === issueId);
      if (issue) return issue;
      return DEMO_ISSUES[0];
    }
    return apiRequest<IssueDetail>(`/issues/${issueId}/`);
  },

  async getByProjectAndNumber(projectIdentifier: string, number: number): Promise<IssueDetail> {
    if (isDemoSession()) {
      const issue = DEMO_ISSUES.find((i) => i.number === number);
      if (issue) return issue;
      return DEMO_ISSUES[0];
    }
    return apiRequest<IssueDetail>(`/projects/${projectIdentifier}/issues/${number}/`);
  },

  async create(projectId: string, payload: CreateIssuePayload): Promise<IssueDetail> {
    if (isDemoSession()) {
      const nextNum = DEMO_ISSUES.length + 1;
      const newIssue: IssueDetail = {
        id: `demo-issue-${Date.now()}`,
        number: nextNum,
        key: `BUG-${nextNum}`,
        project_id: projectId,
        project_key: "BUG",
        project_name: "BugSense Web App",
        title: payload.title,
        description: payload.description || "",
        steps_to_reproduce: payload.steps_to_reproduce || "",
        expected: payload.expected || "",
        actual: payload.actual || "",
        environment: payload.environment || "",
        status: payload.status || "todo",
        priority: payload.priority || "medium",
        severity: payload.severity || "minor",
        type: payload.type || "bug",
        reporter: {
          id: "demo-user-id",
          email: "demo@bugsense.dev",
          full_name: "Demo Recruiter",
        },
        assignee: null,
        labels: [],
        due_date: payload.due_date || null,
        position: (DEMO_ISSUES[DEMO_ISSUES.length - 1]?.position || 0) + 65536.0,
        ai_summary: "",
        ai_metadata: {},
        duplicate_of_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      DEMO_ISSUES.unshift(newIssue);
      return newIssue;
    }
    return apiRequest<IssueDetail>(`/projects/${projectId}/issues/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(issueId: string, payload: UpdateIssuePayload): Promise<IssueDetail> {
    if (isDemoSession()) {
      const idx = DEMO_ISSUES.findIndex((i) => i.id === issueId);
      if (idx !== -1) {
        DEMO_ISSUES[idx] = {
          ...DEMO_ISSUES[idx],
          ...payload,
          updated_at: new Date().toISOString(),
        } as IssueDetail;
        return DEMO_ISSUES[idx];
      }
      return DEMO_ISSUES[0];
    }
    return apiRequest<IssueDetail>(`/issues/${issueId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async delete(issueId: string): Promise<void> {
    if (isDemoSession()) {
      const idx = DEMO_ISSUES.findIndex((i) => i.id === issueId);
      if (idx !== -1) {
        DEMO_ISSUES.splice(idx, 1);
      }
      return;
    }
    await apiRequest<void>(`/issues/${issueId}/`, {
      method: "DELETE",
    });
  },

  async restore(issueId: string): Promise<IssueDetail> {
    if (isDemoSession()) {
      return DEMO_ISSUES[0];
    }
    return apiRequest<IssueDetail>(`/issues/${issueId}/restore/`, {
      method: "POST",
    });
  },

  async listLabels(projectId: string): Promise<Label[]> {
    if (isDemoSession()) {
      return [...DEMO_LABELS];
    }
    return apiRequest<Label[]>(`/projects/${projectId}/labels/`);
  },

  async createLabel(
    projectId: string,
    payload: { name: string; color: string; description?: string }
  ): Promise<Label> {
    if (isDemoSession()) {
      const newLabel: Label = {
        id: `demo-label-${Date.now()}`,
        name: payload.name,
        color: payload.color,
        description: payload.description,
      };
      DEMO_LABELS.push(newLabel);
      return newLabel;
    }
    return apiRequest<Label>(`/projects/${projectId}/labels/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteLabel(labelId: string): Promise<void> {
    if (isDemoSession()) {
      const idx = DEMO_LABELS.findIndex((l) => l.id === labelId);
      if (idx !== -1) {
        DEMO_LABELS.splice(idx, 1);
      }
      return;
    }
    await apiRequest<void>(`/labels/${labelId}/`, {
      method: "DELETE",
    });
  },

  async listActivities(issueId: string): Promise<IssueActivity[]> {
    if (isDemoSession()) {
      return DEMO_ACTIVITIES[issueId] || [];
    }
    return apiRequest<IssueActivity[]>(`/issues/${issueId}/activity/`);
  },

  async getBoard(projectId: string, filters?: IssueFilters): Promise<BoardData> {
    if (isDemoSession()) {
      const listRes = await this.list(projectId, filters);
      const columns: Record<IssueStatus, IssueListItem[]> = {
        backlog: [],
        todo: [],
        in_progress: [],
        in_review: [],
        done: [],
        closed: [],
      };
      const counts: Record<IssueStatus, number> = {
        backlog: 0,
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
        closed: 0,
      };

      const sorted = [...listRes.results].sort((a, b) => a.position - b.position);
      sorted.forEach((item) => {
        if (columns[item.status]) {
          columns[item.status].push(item);
          counts[item.status]++;
        }
      });

      return { columns, counts };
    }

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });
    }
    const queryStr = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<BoardData>(`/projects/${projectId}/board/${queryStr}`);
  },

  async move(issueId: string, payload: MoveIssuePayload): Promise<IssueDetail> {
    if (isDemoSession()) {
      const idx = DEMO_ISSUES.findIndex((i) => i.id === issueId);
      if (idx !== -1) {
        let newPos = DEMO_ISSUES[idx].position;
        const before = payload.before_id
          ? DEMO_ISSUES.find((i) => i.id === payload.before_id)
          : null;
        const after = payload.after_id ? DEMO_ISSUES.find((i) => i.id === payload.after_id) : null;

        if (before && after) {
          newPos = (before.position + after.position) / 2.0;
        } else if (before) {
          newPos = before.position + 65536.0;
        } else if (after) {
          newPos = after.position / 2.0;
        }

        DEMO_ISSUES[idx] = {
          ...DEMO_ISSUES[idx],
          status: payload.status,
          position: newPos,
          updated_at: new Date().toISOString(),
        };
        return DEMO_ISSUES[idx];
      }
      return DEMO_ISSUES[0];
    }

    return apiRequest<IssueDetail>(`/issues/${issueId}/move/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listComments(issueId: string): Promise<Comment[]> {
    if (isDemoSession()) {
      return DEMO_COMMENTS[issueId] || [];
    }
    return apiRequest<Comment[]>(`/issues/${issueId}/comments/`);
  },

  async createComment(issueId: string, payload: CreateCommentPayload): Promise<Comment> {
    if (isDemoSession()) {
      const newComment: Comment = {
        id: `comm-demo-${Date.now()}`,
        author: {
          id: "demo-user-id",
          email: "demo@bugsense.dev",
          full_name: "Demo Recruiter",
        },
        body: payload.body,
        created_at: new Date().toISOString(),
        edited_at: null,
        is_edited: false,
      };
      if (!DEMO_COMMENTS[issueId]) {
        DEMO_COMMENTS[issueId] = [];
      }
      DEMO_COMMENTS[issueId].push(newComment);
      return newComment;
    }
    return apiRequest<Comment>(`/issues/${issueId}/comments/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateComment(commentId: string, payload: UpdateCommentPayload): Promise<Comment> {
    if (isDemoSession()) {
      for (const list of Object.values(DEMO_COMMENTS)) {
        const found = list.find((c) => c.id === commentId);
        if (found) {
          found.body = payload.body;
          found.edited_at = new Date().toISOString();
          found.is_edited = true;
          return found;
        }
      }
      return {
        id: commentId,
        author: { id: "demo-user-id", email: "demo@bugsense.dev", full_name: "Demo Recruiter" },
        body: payload.body,
        created_at: new Date().toISOString(),
        edited_at: new Date().toISOString(),
        is_edited: true,
      };
    }
    return apiRequest<Comment>(`/comments/${commentId}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteComment(commentId: string): Promise<void> {
    if (isDemoSession()) {
      for (const [key, list] of Object.entries(DEMO_COMMENTS)) {
        DEMO_COMMENTS[key] = list.filter((c) => c.id !== commentId);
      }
      return;
    }
    await apiRequest<void>(`/comments/${commentId}/`, {
      method: "DELETE",
    });
  },

  async getTimeline(issueId: string): Promise<TimelineItem[]> {
    if (isDemoSession()) {
      const acts = DEMO_ACTIVITIES[issueId] || [];
      const comms = DEMO_COMMENTS[issueId] || [];

      const timeline: TimelineItem[] = [
        ...acts.map((a) => ({
          id: a.id,
          type: "activity" as const,
          actor: a.actor || { id: "sys", email: "system@bugsense.dev", full_name: "System" },
          verb: a.verb,
          field: a.field,
          old_value: a.old_value,
          new_value: a.new_value,
          body: "",
          is_edited: false,
          edited_at: null,
          created_at: a.created_at,
        })),
        ...comms.map((c) => ({
          id: c.id,
          type: "comment" as const,
          actor: c.author,
          verb: "commented",
          field: "",
          old_value: "",
          new_value: "",
          body: c.body,
          is_edited: c.is_edited,
          edited_at: c.edited_at,
          created_at: c.created_at,
        })),
      ];

      return timeline.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return apiRequest<TimelineItem[]>(`/issues/${issueId}/activity/`);
  },

  async getTimelineByNumber(projectIdentifier: string, number: number): Promise<TimelineItem[]> {
    if (isDemoSession()) {
      const issue = DEMO_ISSUES.find((i) => i.number === number);
      if (issue) {
        return this.getTimeline(issue.id);
      }
      return this.getTimeline("demo-issue-1");
    }
    return apiRequest<TimelineItem[]>(`/projects/${projectIdentifier}/issues/${number}/activity/`);
  },
};
