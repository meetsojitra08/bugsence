import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { authApi } from "../api/authApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSentMessage(
        res.message ||
          "If an account exists for that email, reset instructions have been sent."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we will send a password reset link if your account is active."
      hideDemoCta
    >
      {sentMessage ? (
        <div
          className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5 text-sm"
          data-testid="forgot-password-sent"
        >
          <div className="flex items-start gap-2.5 text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-medium leading-relaxed">{sentMessage}</p>
          </div>
          <p className="text-xs text-text-muted">
            Check your inbox or spam folder, then follow the link to set a new password.
          </p>
          <Link
            to="/login"
            className="inline-block text-xs font-medium text-accent hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              {error}
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <Label htmlFor="forgot-email">Work email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="pl-9"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending instructions…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>

          <p className="pt-2 text-center text-xs text-text-muted">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
