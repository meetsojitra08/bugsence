import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  LayoutGrid,
  Inbox,
  CheckSquare,
  FolderGit2,
  Settings,
  Sun,
  Moon,
  LogOut,
  Users,
  User,
  PlusCircle,
} from "lucide-react";
import { useUiStore } from "@/stores/useUiStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { searchApi, type GlobalSearchResponse } from "@/features/projects/api/searchApi";

export function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen, openCaptureModal, showInsightsNav } =
    useUiStore();
  const { logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse>({
    issues: [],
    projects: [],
    people: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard shortcut Cmd/Ctrl+K opens the palette, Escape closes it.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === "Escape" && isCommandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  // Reset the query whenever the palette closes so it always opens clean.
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setSearchQuery("");
      setSearchResults({ issues: [], projects: [], people: [] });
      setIsSearching(false);
    }
  }, [isCommandPaletteOpen]);

  // Debounced search with a stale-response guard.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ issues: [], projects: [], people: [] });
      setIsSearching(false);
      return;
    }

    let ignore = false;
    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await searchApi.search(searchQuery);
        if (!ignore) setSearchResults(res);
      } catch (err) {
        if (!ignore) console.error("Search failed:", err);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }, 200);

    return () => {
      ignore = true;
      clearTimeout(handler);
    };
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
      data-testid="command-palette-backdrop"
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-surface text-text shadow-modal duration-150"
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette-dialog"
      >
        <Command label="Global Command Menu" className="w-full" shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Type a command or search issues, projects, people..."
              className="h-12 w-full bg-transparent px-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
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

          <Command.List className="max-h-80 overflow-y-auto p-1.5 text-sm">
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
                    className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                    onSelect={() =>
                      runAction(() =>
                        navigate(`/p/${issue.project_key}/issues/${issue.number}`)
                      )
                    }
                    data-testid={`search-item-issue-${issue.key}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckSquare className="h-4 w-4 flex-shrink-0 text-accent" />
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
                className="mt-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted"
                data-testid="search-results-projects"
              >
                {searchResults.projects.map((proj) => (
                  <Command.Item
                    key={proj.id}
                    value={`project-${proj.key}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                    onSelect={() => runAction(() => navigate(`/p/${proj.key}/issues`))}
                    data-testid={`search-item-project-${proj.key}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderGit2 className="h-4 w-4 flex-shrink-0 text-accent" />
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
                className="mt-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted"
                data-testid="search-results-people"
              >
                {searchResults.people.map((person) => (
                  <Command.Item
                    key={person.id}
                    value={`person-${person.email}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
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
              className="mt-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted"
            >
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => navigate("/today"))}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Today</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => navigate("/inbox"))}
              >
                <Inbox className="h-4 w-4" />
                <span>Inbox</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => navigate("/issues"))}
              >
                <CheckSquare className="h-4 w-4" />
                <span>Issues</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => navigate("/board"))}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Board</span>
              </Command.Item>
              {showInsightsNav && (
                <Command.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                  onSelect={() => runAction(() => navigate("/insights"))}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Insights</span>
                </Command.Item>
              )}
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => navigate("/settings/members"))}
              >
                <Users className="h-4 w-4" />
                <span>Members</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => navigate("/settings"))}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="mt-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted"
            >
              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => openCaptureModal())}
              >
                <PlusCircle className="h-4 w-4 text-accent" />
                <span>Capture (C)</span>
              </Command.Item>

              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated aria-selected:text-text"
                onSelect={() => runAction(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-warning" />
                ) : (
                  <Moon className="h-4 w-4 text-text-muted" />
                )}
                <span>Toggle {resolvedTheme === "dark" ? "Light" : "Dark"} Mode</span>
              </Command.Item>

              <Command.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-danger transition-colors hover:bg-danger/10 aria-selected:bg-danger/10"
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
