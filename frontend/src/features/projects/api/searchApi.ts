import { apiRequest } from "@/lib/apiClient";
import { isDemoSession } from "@/lib/demo";

export interface SearchIssueResult {
  id: string;
  number: number;
  key: string;
  title: string;
  status: string;
  priority: string;
  project_key: string;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  key: string;
  description: string;
}

export interface SearchPersonResult {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface GlobalSearchResponse {
  issues: SearchIssueResult[];
  projects: SearchProjectResult[];
  people: SearchPersonResult[];
}

const DEMO_SEARCH_DATA: GlobalSearchResponse = {
  issues: [
    {
      id: "issue-1",
      number: 1,
      key: "BUG-1",
      title: "Fix authentication token refresh race condition",
      status: "in_progress",
      priority: "urgent",
      project_key: "BUG",
    },
    {
      id: "issue-2",
      number: 2,
      key: "BUG-2",
      title: "CORS configuration on staging",
      status: "in_review",
      priority: "high",
      project_key: "BUG",
    },
    {
      id: "issue-3",
      number: 3,
      key: "BUG-3",
      title: "Implement drag and drop Kanban columns",
      status: "done",
      priority: "medium",
      project_key: "BUG",
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "BugSense Web App",
      key: "BUG",
      description: "Main web application and cloud services frontend.",
    },
    {
      id: "proj-2",
      name: "Mobile Client App",
      key: "MOB",
      description: "Cross-platform mobile application built with React Native.",
    },
  ],
  people: [
    {
      id: "user-1",
      full_name: "Sarah Chen",
      email: "sarah.chen@bugsense.dev",
    },
    {
      id: "user-2",
      full_name: "Marcus Vance",
      email: "marcus.vance@bugsense.dev",
    },
  ],
};

export const searchApi = {
  async search(query: string): Promise<GlobalSearchResponse> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { issues: [], projects: [], people: [] };
    }

    if (isDemoSession()) {
      return {
        issues: DEMO_SEARCH_DATA.issues.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.key.toLowerCase().includes(q) ||
            String(i.number).includes(q)
        ),
        projects: DEMO_SEARCH_DATA.projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.key.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        ),
        people: DEMO_SEARCH_DATA.people.filter(
          (u) =>
            u.full_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        ),
      };
    }

    return apiRequest<GlobalSearchResponse>("/search/", {
      params: { q: query },
    });
  },
};
