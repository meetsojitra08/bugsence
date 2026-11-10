import { NavLink } from "react-router-dom";
import { LogOut, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { useUiStore } from "@/stores/useUiStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { BrandMark } from "@/components/common/BrandMark";
import { Button } from "@/components/ui/button";
import { ProjectSwitcher } from "@/features/projects/components/ProjectSwitcher";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { useAppNavigation } from "./useAppNavigation";
import { formatShortcut } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export function Topbar({ onMobileMenuToggle }: TopbarProps) {
  const { toggleCommandPalette, openCaptureModal } = useUiStore();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { navItems } = useAppNavigation();

  const searchShortcut = formatShortcut("K");

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md"
      data-testid="app-topbar"
    >
      <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-2 px-4 sm:px-6 lg:px-10">
        {onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="h-8 w-8 text-text-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        <NavLink to="/today">
          <BrandMark />
        </NavLink>

        <nav className="ml-6 hidden h-16 items-stretch lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              aria-label={item.ariaLabel}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-1.5 px-3 text-[13px] font-medium transition-colors",
                  isActive ? "text-text" : "text-text-muted hover:text-text"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span>{item.name}</span>
                  {item.badgeCount !== undefined && (
                    <span
                      className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-accent"
                      data-testid="nav-inbox-badge"
                    >
                      {item.badgeCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute inset-x-2.5 bottom-0 h-[2px] rounded-full bg-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <div className="hidden w-40 md:block xl:w-48">
            <ProjectSwitcher />
          </div>

          <Button
            size="sm"
            onClick={openCaptureModal}
            className="h-8 gap-1 px-2.5 text-xs"
            title="Capture (C)"
            aria-label="Capture"
            data-testid="topbar-capture-button"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Capture</span>
          </Button>

          <button
            type="button"
            onClick={toggleCommandPalette}
            className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2 text-[12px] text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            title={`Search or execute actions (${searchShortcut})`}
            aria-label="Search or execute actions"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden items-center rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px] sm:inline-flex">
              {searchShortcut}
            </kbd>
          </button>

          <NotificationBell />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-text-muted hover:text-text"
            title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

          <div
            className="hidden h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent ring-1 ring-accent/30 sm:flex"
            title={user?.email}
          >
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "ME"}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            className="h-8 w-8 text-text-muted hover:bg-danger/10 hover:text-danger"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
