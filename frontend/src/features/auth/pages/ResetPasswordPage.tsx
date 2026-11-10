import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { authApi } from "../api/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!uid || !token) {
      setError("Reset link is missing required parameters. Request a new one below.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ uid, token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter a strong password to finish resetting your BugSense account."
      hideDemoCta
    >
      {done ? (
        <div
          className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5 text-sm"
          data-testid="reset-password-done"
        >
          <div className="flex items-start gap-2.5 text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-medium">Your password has been updated.</p>
          </div>
          <Link
            to="/login"
            className="inline-block rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-95"
          >
            Sign in with new password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              {error}
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <Label htmlFor="reset-new-password">New password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                id="reset-new-password"
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="reset-confirm-password">Confirm new password</Label>
            <Input
              id="reset-confirm-password"
              type={showPasswords ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password…
              </>
            ) : (
              "Update password"
            )}
          </Button>

          <p className="pt-2 text-center text-xs text-text-muted">
            Need a fresh link?{" "}
            <Link to="/forgot-password" className="font-medium text-accent hover:underline">
              Request password reset
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
