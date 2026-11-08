import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ProjectBadgeProps {
  name: string;
  projectKey: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BADGE_COLORS = [
  "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  "bg-violet-500/15 text-violet-500 border-violet-500/30",
  "bg-amber-500/15 text-amber-500 border-amber-500/30",
  "bg-rose-500/15 text-rose-500 border-rose-500/30",
  "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  "bg-blue-500/15 text-blue-500 border-blue-500/30",
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
