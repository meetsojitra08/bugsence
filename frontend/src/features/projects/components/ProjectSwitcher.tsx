import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { ProjectBadge } from "./ProjectBadge";
import { CreateProjectModal } from "./CreateProjectModal";
import { useProjects } from "../hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { cn } from "@/lib/utils";

interface ProjectSwitcherProps {
  collapsed?: boolean;
}

export function ProjectSwitcher({ collapsed = false }: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: projects = [], isLoading } = useProjects();
  const { currentProjectId, setCurrentProjectId, getActiveProject } = useProjectStore();

  const activeProject = getActiveProject(projects);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Global shortcut Cmd+P / Ctrl+P to toggle project switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (id: string) => {
    setCurrentProjectId(id);
    setIsOpen(false);
  };

  if (isLoading && !activeProject) {
    return (
      <div className="flex h-10 animate-pulse items-center gap-2 rounded-lg border border-border/50 bg-surface/50 px-2.5">
        <div className="h-6 w-6 rounded-md bg-surface-elevated" />
        {!collapsed && <div className="h-4 w-24 rounded bg-surface-elevated" />}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch project"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-surface px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          collapsed && "justify-center px-1.5"
        )}
      >
        {activeProject ? (
          <>
            <ProjectBadge name={activeProject.name} projectKey={activeProject.key} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-text-primary truncate text-xs font-semibold">
                  {activeProject.name}
                </p>
                <p className="font-mono text-[10px] text-text-muted">{activeProject.key}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border text-xs text-text-muted">
              P
            </div>
            {!collapsed && <span className="text-xs text-text-muted">Select project</span>}
          </>
        )}

        {!collapsed && (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available projects"
          className="animate-in fade-in zoom-in-95 absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-xl duration-150"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Projects
          </div>

          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text-muted">
                No projects found.
              </div>
            ) : (
              projects.map((proj) => {
                const isSelected = proj.id === (activeProject?.id || currentProjectId);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(proj.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-surface-elevated",
                      isSelected && "text-text-primary bg-surface-elevated font-medium"
                    )}
                  >
                    <ProjectBadge name={proj.name} projectKey={proj.key} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate text-xs">{proj.name}</p>
                      <p className="font-mono text-[10px] text-text-muted">
                        {proj.key} · {proj.members_count}{" "}
                        {proj.members_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCreateOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
