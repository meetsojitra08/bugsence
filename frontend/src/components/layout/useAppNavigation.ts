import { useEffect } from "react";
import {
  BarChart3,
  CheckSquare,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useInbox } from "@/features/issues/hooks/useIssues";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { useUiStore } from "@/stores/useUiStore";
import { daysSince } from "@/lib/format";

export interface AppNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  end: boolean;
  badgeCount?: number;
  ariaLabel?: string;
}

const INSIGHTS_UNLOCK_THRESHOLD = 15;

export function useAppNavigation() {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();
  const getActiveProject = useProjectStore((s) => s.getActiveProject);
  const activeProject = getActiveProject(projects);

  const inboxCount = activeProject?.inbox_count ?? 0;
  const isCurrentTriager = Boolean(
    activeProject &&
      (!activeProject.triage_rotation_enabled ||
        activeProject.current_triager_id === user?.id ||
        (!activeProject.current_triager_id && activeProject.owner_id === user?.id))
  );

  // Only poll inbox timestamps for badge urgency when user isn't today's triager.
  const { data: inboxItems = [] } = useInbox(
    inboxCount > 0 && !isCurrentTriager ? activeProject?.id || null : null
  );
  const hasStaleInboxItem = inboxItems.some((item) => daysSince(item.created_at) >= 1);
  const showInboxBadge = inboxCount > 0 && (isCurrentTriager || hasStaleInboxItem);
  const showInsights = (activeProject?.total_issues_count ?? 0) >= INSIGHTS_UNLOCK_THRESHOLD;
  const setShowInsightsNav = useUiStore((s) => s.setShowInsightsNav);

  useEffect(() => {
    setShowInsightsNav(showInsights);
  }, [showInsights, setShowInsightsNav]);

  const navItems: AppNavItem[] = [
    { name: "Today", href: "/today", icon: LayoutDashboard, end: false },
    {
      name: "Inbox",
      href: "/inbox",
      icon: Inbox,
      end: false,
      badgeCount: showInboxBadge ? inboxCount : undefined,
      ariaLabel: showInboxBadge ? `Inbox (${inboxCount} pending triage)` : "Inbox",
    },
    { name: "Issues", href: "/issues", icon: CheckSquare, end: false },
    { name: "Board", href: "/board", icon: LayoutGrid, end: false },
    ...(showInsights
      ? [{ name: "Insights", href: "/insights", icon: BarChart3, end: false }]
      : []),
    { name: "Members", href: "/settings/members", icon: Users, end: false },
    { name: "Settings", href: "/settings", icon: Settings, end: true },
  ];

  return {
    activeProject,
    navItems,
    inboxCount,
    showInboxBadge,
    showInsights,
  };
}
