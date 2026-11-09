import { apiRequest } from "@/lib/apiClient";

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

export const searchApi = {
  async search(query: string): Promise<GlobalSearchResponse> {
    if (!query.trim()) return { issues: [], projects: [], people: [] };
    return apiRequest<GlobalSearchResponse>("/search/", { params: { q: query } });
  },
};
