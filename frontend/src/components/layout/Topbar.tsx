import { useLocation } from "react-router-dom";
import { Search, Sparkles, Sun, Moon, LogOut, Menu } from "lucide-react";
import { useUiStore } from "@/stores/useUiStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { ProjectSwitcher } from "@/features/projects/components/ProjectSwitcher";

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const { toggleCommandPalette } = useUiStore();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case "/dashboard":
        return "Dashboard";
      case "/my-issues":
        return "My Issues";
      case "/settings/members":
      case "/projects/members":
        return "Team Members";
      case "/settings":
        return "Settings";
      default:
        return "Overview";
    }
  };

  return (
    <header
      className="flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md"
      data-testid="app-topbar"
    >
      {/* Left: Mobile hamburger & Project Switcher & Breadcrumb */}
      <div className="flex items-center gap-2.5">
        {onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="h-8 w-8 text-text-muted md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        <div className="w-48 sm:w-56">
          <ProjectSwitcher />
        </div>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <span className="text-text-primary hidden text-xs font-semibold sm:inline">
          {getPageTitle(location.pathname)}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={toggleCommandPalette}
          className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
          title="Search or execute actions (⌘K)"
          aria-label="Search or execute actions"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden items-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline-flex">
            ⌘K
          </kbd>
        </button>

        {/* AI Quick Indicator */}
        <div className="hidden items-center gap-1.5 rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 sm:flex">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gemini AI</span>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-8 w-8 text-text-muted hover:text-text"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Dropdown / Sign out */}
        <div className="flex items-center gap-2 border-l border-border pl-1">
          <div
            className="shadow-xs flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
            title={user?.email}
          >
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "ME"}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="h-8 w-8 text-text-muted hover:bg-danger/10 hover:text-danger"
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
