import React from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) {
    return { score: 0, label: "", color: "bg-border" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Weak", color: "bg-danger" };
    case 2:
      return { score: 2, label: "Fair", color: "bg-warning" };
    case 3:
      return { score: 3, label: "Good", color: "bg-warning" };
    case 4:
      return { score: 4, label: "Strong", color: "bg-success" };
    default:
      return { score: 0, label: "Too short", color: "bg-danger" };
  }
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const { score, label, color } = calculatePasswordStrength(password);

  return (
    <div className="mt-1.5 space-y-1" data-testid="password-strength-meter">
      <div className="flex h-1 w-full gap-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-full flex-1 rounded-full transition-all duration-300",
              step <= score ? color : "bg-border"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-text-muted">
        <span>Password strength</span>
        <span
          className={cn(
            "font-medium",
            score <= 1 && "text-danger",
            score === 2 && "text-warning",
            score === 3 && "text-warning",
            score === 4 && "text-success"
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
