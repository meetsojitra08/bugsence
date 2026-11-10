import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";
import { getSafeNextPath, resolvePostAuthDestination } from "../utils/redirect";
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
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const safeNext = getSafeNextPath(searchParams);
  const destination = resolvePostAuthDestination(safeNext, location.state, "/today");
  const isInviteFlow = Boolean(safeNext?.startsWith("/invite/"));

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
      toast.success("Signed in to BugSense.");
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || "Invalid email or password.");
      } else {
        setFormError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to open your project inbox, board, and assigned work."
      inviteNotice={
        isInviteFlow ? "Sign in to your account to accept the project invitation." : null
      }
      hideDemoCta={isInviteFlow}
    >
      {!isLoading && isAuthenticated && <Navigate to={destination} replace />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger"
          >
            {formError}
          </div>
        )}

        <div className="space-y-1.5 text-left">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.dev"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-[11px] text-danger">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-[11px] font-medium text-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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

        <Button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Sign In
        </Button>

        <div className="pt-1 text-center text-xs text-text-muted">
          Don&apos;t have an account?{" "}
          <Link
            to={safeNext ? `/register?next=${encodeURIComponent(safeNext)}` : "/register"}
            className="font-medium text-accent hover:underline"
          >
            Sign up
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
