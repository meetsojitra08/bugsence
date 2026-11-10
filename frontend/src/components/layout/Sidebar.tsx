import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/common/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUiStore } from "@/stores/useUiStore";
import { useAppNavigation } from "./useAppNavigation";

export function Sidebar() {
  const { user } = useAuth();
  const { openCaptureModal } = useUiStore();
  const { navItems } = useAppNavigation();

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
        <NavLink to="/today">
          <BrandMark />
        </NavLink>
      </div>

      <div className="border-b border-border/60 p-3">
        <Button size="sm" onClick={openCaptureModal} className="w-full justify-center gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Capture bug report
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Sidebar navigation">
        <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Project
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                aria-label={item.ariaLabel}
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
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badgeCount !== undefined && (
                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                        {item.badgeCount}
                      </span>
                    )}
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
