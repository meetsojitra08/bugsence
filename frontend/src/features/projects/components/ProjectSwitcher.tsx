import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const { setCurrentProjectId, getActiveProject } = useProjectStore();
  const location = useLocation();
  const navigate = useNavigate();

  const activeProject = getActiveProject(projects);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (id: string) => {
    const project = projects.find((item) => item.id === id);
    setCurrentProjectId(id);
    setIsOpen(false);

    if (project && location.pathname.startsWith("/p/")) {
      const suffix = location.pathname.replace(/^\/p\/[^/]+\/?/, "");
      navigate(`/p/${project.key.toLowerCase()}/${suffix}`);
    }
  };

  if (isLoading && !activeProject) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2">
        <div className="h-4 w-4 animate-pulse rounded bg-surface-elevated" />
        <div className="h-3 w-20 animate-pulse rounded bg-surface-elevated" />
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
          "flex h-8 w-full items-center gap-2 rounded-md border border-border bg-surface px-2 text-left transition-colors hover:bg-surface-elevated",
          collapsed && "justify-center px-1.5"
        )}
      >
        {activeProject ? (
          <>
            <ProjectBadge name={activeProject.name} projectKey={activeProject.key} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium leading-tight text-text">
                  {activeProject.name}
                </p>
                <p className="truncate font-mono text-[10px] leading-tight text-text-muted">
                  {activeProject.key}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-border text-[10px] text-text-muted">
              P
            </div>
            {!collapsed && <span className="text-[12px] text-text-muted">Select project</span>}
          </>
        )}
        {!collapsed && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available projects"
          className="animate-in fade-in zoom-in-95 absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-border bg-surface p-1 shadow-popover duration-150"
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Projects
          </div>

          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text-muted">
                No projects yet.
              </div>
            ) : (
              projects.map((project) => {
                const isSelected = project.id === activeProject?.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(project.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-elevated",
                      isSelected && "bg-surface-elevated"
                    )}
                  >
                    <ProjectBadge name={project.name} projectKey={project.key} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-text">{project.name}</p>
                      <p className="truncate font-mono text-[10px] text-text-muted">
                        {project.key} · {project.members_count}{" "}
                        {project.members_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
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
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>
      )}

      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
