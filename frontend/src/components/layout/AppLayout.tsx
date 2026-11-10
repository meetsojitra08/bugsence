import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcutsModal } from "@/components/common/KeyboardShortcutsModal";
import { CreateIssueModal } from "@/features/issues/components/CreateIssueModal";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { useUiStore } from "@/stores/useUiStore";

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const { isCaptureModalOpen, setCaptureModalOpen, openCaptureModal, isCommandPaletteOpen } =
    useUiStore();
  const { data: projects = [] } = useProjects();
  const getActiveProject = useProjectStore((s) => s.getActiveProject);
  const activeProject = getActiveProject(projects);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (isCaptureModalOpen && projects.length > 0 && !activeProject) {
      setCaptureModalOpen(false);
    }
  }, [isCaptureModalOpen, activeProject, projects.length, setCaptureModalOpen]);

  // Global 'C' shortcut opens the Capture modal from anywhere when not typing in a field or dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "c") return;
      if (isCommandPaletteOpen || isCaptureModalOpen) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (document.querySelector('[role="dialog"]')) return;

      event.preventDefault();
      if (!activeProject) {
        toast.info("Create or select a project first before capturing an issue.");
        return;
      }
      openCaptureModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeProject, isCaptureModalOpen, isCommandPaletteOpen, openCaptureModal]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-text">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-text focus:shadow-modal"
      >
        Skip to content
      </a>

      <Topbar onMobileMenuToggle={() => setMobileMenuOpen(true)} />

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-in slide-in-from-left fixed inset-y-0 left-0 z-50 flex w-[260px] duration-200 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-[1360px]">
          <Outlet />
        </div>
      </main>

      <CommandPalette />
      <KeyboardShortcutsModal />

      {activeProject && (
        <CreateIssueModal
          isOpen={isCaptureModalOpen}
          onClose={() => setCaptureModalOpen(false)}
          projectId={activeProject.id}
          projectKey={activeProject.key}
        />
      )}
    </div>
  );
}
