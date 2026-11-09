import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  LayoutGrid,
  Settings,
  Bug,
  Inbox,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, end: false },
  { name: "My issues", href: "/my-issues", icon: Inbox, end: false },
  { name: "Issues", href: "/issues", icon: CheckSquare, end: false },
  { name: "Board", href: "/board", icon: LayoutGrid, end: false },
  { name: "Team Members", href: "/settings/members", icon: Users, end: false },
  { name: "Settings", href: "/settings", icon: Settings, end: true },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-border bg-surface"
      data-testid="app-sidebar"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Bug className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold leading-tight">BugSense</p>
          <p className="text-[11px] leading-tight text-text-muted">Engineering</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <p className="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Workspace
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-surface-elevated text-text"
                      : "text-text-muted hover:bg-surface-elevated/60 hover:text-text"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-accent" : "text-text-muted group-hover:text-text"
                      )}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent ring-1 ring-accent/30">
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "ME"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium leading-tight text-text">
              {user?.fullName || user?.displayName || "Developer"}
            </p>
            <p className="truncate text-[11px] leading-tight text-text-muted">
              {user?.email || "developer@example.com"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
