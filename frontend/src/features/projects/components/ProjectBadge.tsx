import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProjectBadgeProps {
  name: string;
  projectKey: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BADGE_COLORS = [
  "bg-accent/10 text-accent border-accent/25",
  "bg-surface-elevated text-text-muted border-border",
  "bg-danger/10 text-danger border-danger/25",
  "bg-accent/15 text-accent border-accent/30",
  "bg-surface text-text border-border",
  "bg-danger/15 text-danger border-danger/30",
  "bg-surface-elevated text-text border-border",
];

export function ProjectBadge({ name, projectKey, size = "md", className }: ProjectBadgeProps) {
  const colorClass = useMemo(() => {
    let hash = 0;
    const str = `${projectKey}-${name}`;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % BADGE_COLORS.length;
    return BADGE_COLORS[index];
  }, [name, projectKey]);

  const initials = useMemo(() => {
    if (projectKey && projectKey.length <= 3) {
      return projectKey.toUpperCase();
    }
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return (projectKey || name || "P").slice(0, 2).toUpperCase();
  }, [name, projectKey]);

  const sizeClasses = {
    sm: "h-6 w-6 text-xs rounded-md",
    md: "h-8 w-8 text-xs font-semibold rounded-lg",
    lg: "h-10 w-10 text-sm font-bold rounded-xl",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border font-mono tracking-wider shadow-sm",
        sizeClasses[size],
        colorClass,
        className
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
