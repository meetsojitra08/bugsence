import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  FolderGit2,
  Settings,
  Sun,
  Moon,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useUiStore } from "@/stores/useUiStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const { logout, loginAsDemo } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const runAction = (callback: () => void) => {
    setCommandPaletteOpen(false);
    callback();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20 backdrop-blur-md"
      onClick={() => setCommandPaletteOpen(false)}
      data-testid="command-palette-backdrop"
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface-elevated text-text shadow-2xl duration-150"
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette-dialog"
      >
        <Command label="Global Command Menu" className="w-full">
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              placeholder="Type a command or search..."
              className="h-11 w-full bg-transparent px-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
              autoFocus
            />
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2 text-sm">
            <Command.Empty className="py-6 text-center text-xs text-text-muted">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted"
            >
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                onSelect={() => runAction(() => navigate("/dashboard"))}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                onSelect={() => runAction(() => navigate("/my-issues"))}
              >
                <CheckSquare className="h-4 w-4" />
                <span>My Issues</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                onSelect={() => runAction(() => navigate("/projects"))}
              >
                <FolderGit2 className="h-4 w-4" />
                <span>Projects</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                onSelect={() => runAction(() => navigate("/settings"))}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="mt-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted"
            >
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                onSelect={() => runAction(() => setTheme(theme === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-warning" />
                ) : (
                  <Moon className="h-4 w-4 text-text-muted" />
                )}
                <span>Toggle {theme === "dark" ? "Light" : "Dark"} Mode</span>
              </Command.Item>

              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                onSelect={() => runAction(() => loginAsDemo())}
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Switch to Demo Account</span>
              </Command.Item>

              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-danger transition-colors hover:bg-danger/10 aria-selected:bg-danger/10"
                onSelect={() => runAction(() => logout())}
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
