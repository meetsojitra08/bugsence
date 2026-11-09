import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Sparkles, LogIn } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/apiClient";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, loginAsDemo, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const destination =
    (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    try {
      await login(data);
      toast.success("Welcome back to BugSense AI!");
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || "Invalid email or password.");
      } else {
        setFormError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setFormError(null);
    try {
      await loginAsDemo();
      toast.success("Signed in with recruiter demo account!");
      navigate(destination, { replace: true });
    } catch {
      toast.error("Failed to sign in as demo.");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account or jump straight in with demo mode."
    >
      {!isLoading && isAuthenticated && <Navigate to={destination} replace />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Generic Form Error Alert */}
        {formError && (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger"
          >
            {formError}
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="developer@example.com"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-[11px] text-danger">{errors.email.message}</p>}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-9"
              error={!!errors.password}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] text-danger">{errors.password.message}</p>}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2"
          disabled={isSubmitting || isDemoLoading}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Sign In
        </Button>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-surface px-2 text-[11px] uppercase tracking-wider text-text-muted">
            Or
          </span>
        </div>

        {/* 1-Click Recruiter Demo Button */}
        <Button
          type="button"
          variant="ai"
          className="flex w-full items-center justify-center gap-2"
          onClick={handleDemoLogin}
          disabled={isSubmitting || isDemoLoading}
        >
          {isDemoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Try Demo Account
        </Button>

        {/* Link to Register */}
        <div className="pt-2 text-center text-xs text-text-muted">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
