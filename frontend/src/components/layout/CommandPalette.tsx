import { useEffect, useState } from "react";
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
  Users,
  User,
  PlusCircle,
} from "lucide-react";
import { useUiStore } from "@/stores/useUiStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { searchApi, type GlobalSearchResponse } from "@/features/projects/api/searchApi";

export function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const { logout, loginAsDemo } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse>({
    issues: [],
    projects: [],
    people: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard shortcut Cmd/Ctrl+K
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

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ issues: [], projects: [], people: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await searchApi.search(searchQuery);
        setSearchResults(res);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  if (!isCommandPaletteOpen) return null;

  const runAction = (callback: () => void) => {
    setCommandPaletteOpen(false);
    setSearchQuery("");
    callback();
  };

  const hasResults =
    searchResults.issues.length > 0 ||
    searchResults.projects.length > 0 ||
    searchResults.people.length > 0;

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
        <Command label="Global Command Menu" className="w-full" shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Type a command or search issues, projects, people..."
              className="h-11 w-full bg-transparent px-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
              autoFocus
              data-testid="command-palette-input"
            />
            {isSearching ? (
              <span className="text-[11px] text-text-muted animate-pulse">Searching...</span>
            ) : (
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                ESC
              </kbd>
            )}
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 text-sm">
            {searchQuery.trim() && !hasResults && !isSearching && (
              <Command.Empty className="py-6 text-center text-xs text-text-muted">
                No matching issues, projects, or team members found.
              </Command.Empty>
            )}

            {/* Dynamic Search Results */}
            {searchResults.issues.length > 0 && (
              <Command.Group
                heading="Issues"
                className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                data-testid="search-results-issues"
              >
                {searchResults.issues.map((issue) => (
                  <Command.Item
                    key={issue.id}
                    value={`issue-${issue.key}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                    onSelect={() =>
                      runAction(() =>
                        navigate(`/p/${issue.project_key}/issues/${issue.number}`)
                      )
                    }
                    data-testid={`search-item-issue-${issue.key}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckSquare className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="font-mono text-text-muted">{issue.key}</span>
                      <span className="truncate">{issue.title}</span>
                    </div>
                    <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted capitalize">
                      {issue.status.replace("_", " ")}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {searchResults.projects.length > 0 && (
              <Command.Group
                heading="Projects"
                className="mt-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                data-testid="search-results-projects"
              >
                {searchResults.projects.map((proj) => (
                  <Command.Item
                    key={proj.id}
                    value={`project-${proj.key}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                    onSelect={() => runAction(() => navigate(`/p/${proj.key}/issues`))}
                    data-testid={`search-item-project-${proj.key}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderGit2 className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="font-semibold text-text">{proj.name}</span>
                      <span className="font-mono text-text-muted">[{proj.key}]</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {searchResults.people.length > 0 && (
              <Command.Group
                heading="People"
                className="mt-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                data-testid="search-results-people"
              >
                {searchResults.people.map((person) => (
                  <Command.Item
                    key={person.id}
                    value={`person-${person.email}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs text-text transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:text-primary"
                    onSelect={() => runAction(() => navigate("/settings/members"))}
                    data-testid={`search-item-person-${person.email}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <User className="h-4 w-4 flex-shrink-0 text-text-muted" />
                      <span className="font-medium text-text">{person.full_name}</span>
                      <span className="text-text-muted text-[11px]">{person.email}</span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Standard Quick Navigation & Actions */}
            <Command.Group
              heading="Navigation"
              className="mt-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted"
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
                onSelect={() => runAction(() => navigate("/settings/members"))}
              >
                <Users className="h-4 w-4" />
                <span>Team Members</span>
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
                onSelect={() => runAction(() => navigate("/issues"))}
              >
                <PlusCircle className="h-4 w-4 text-primary" />
                <span>Create New Issue (C)</span>
              </Command.Item>

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
