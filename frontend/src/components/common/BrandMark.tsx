import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: "sm" | "md";
  className?: string;
}

export function BrandMark({ size = "sm", className }: BrandMarkProps) {
  const iconBox = size === "md" ? "h-8 w-8" : "h-7 w-7";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-md bg-accent text-accent-foreground shadow-xs",
          iconBox
        )}
      >
        <Bug className="h-4 w-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-text">BugSense</span>
    </span>
  );
}
