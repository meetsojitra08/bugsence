import { AlertOctagon, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IssuePriority } from "../types";

export function PriorityIcon({
  priority,
  className,
}: {
  priority: IssuePriority;
  className?: string;
}) {
  switch (priority) {
    case "urgent":
      return <AlertOctagon className={cn("h-3.5 w-3.5 text-priority-urgent", className)} />;
    case "high":
      return <ArrowUp className={cn("h-3.5 w-3.5 text-priority-high", className)} />;
    case "medium":
      return <Minus className={cn("h-3.5 w-3.5 text-priority-medium", className)} />;
    case "low":
    default:
      return <ArrowDown className={cn("h-3.5 w-3.5 text-priority-low", className)} />;
  }
}
