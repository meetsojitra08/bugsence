import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Settings,
  Bug,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/useUiStore";
import { useAuth } from "@/features/auth/hooks/useAuth";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Issues", href: "/my-issues", icon: CheckSquare },
  { name: "Team Members", href: "/settings/members", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUiStore();
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "flex select-none flex-col justify-between border-r border-border bg-surface transition-all duration-200",
        isSidebarCollapsed ? "w-16" : "w-60"
      )}
      data-testid="app-sidebar"
    >
      {/* Top Header / Workspace Switcher */}
      <div>
        <div className="flex h-14 items-center justify-between border-b border-border px-3.5">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary text-white shadow-sm">
                <Bug className="h-4 w-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate text-xs font-semibold text-text">BugSense Workspace</span>
                <span className="truncate text-[10px] text-text-muted">Engineering Org</span>
              </div>
              <ChevronDown className="ml-auto h-3 w-3 flex-shrink-0 text-text-muted" />
            </div>
          ) : (
            <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white shadow-sm">
              <Bug className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "shadow-xs bg-surface-elevated font-semibold text-primary"
                      : "text-text-muted hover:bg-surface-elevated hover:text-text",
                    isSidebarCollapsed && "justify-center px-0"
                  )
                }
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Collapse Button */}
      <div className="space-y-1 border-t border-border p-2">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-surface-elevated",
            isSidebarCollapsed && "justify-center"
          )}
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "ME"}
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate text-left">
              <span className="truncate text-xs font-medium text-text">
                {user?.fullName || user?.displayName || "Developer"}
              </span>
              <span className="truncate text-[10px] text-text-muted">
                {user?.email || "developer@example.com"}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-elevated hover:text-text",
            isSidebarCollapsed && "justify-center px-0"
          )}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
