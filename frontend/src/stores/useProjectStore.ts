import { create } from "zustand";
import type { Project } from "@/features/projects/types";

const STORAGE_KEY = "bugsense_active_project_id";

interface ProjectState {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  getActiveProject: (projects?: Project[]) => Project | null;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProjectId: localStorage.getItem(STORAGE_KEY),

  setCurrentProjectId: (id) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ currentProjectId: id });
  },

  getActiveProject: (projects) => {
    if (!projects || projects.length === 0) return null;
    const currentId = get().currentProjectId;
    if (currentId) {
      const match = projects.find((p) => p.id === currentId);
      if (match) return match;
    }
    // Fall back to first non-archived or first project and remember the choice.
    const fallback = projects.find((p) => !p.archived) || projects[0];
    if (fallback && fallback.id !== currentId) {
      get().setCurrentProjectId(fallback.id);
    }
    return fallback || null;
  },
}));
