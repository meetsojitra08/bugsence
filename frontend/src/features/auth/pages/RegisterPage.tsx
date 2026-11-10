import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "../components/AuthLayout";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import { useAuth } from "../hooks/useAuth";
import { getSafeNextPath, resolvePostAuthDestination } from "../utils/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/apiClient";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser, isAuthenticated, isLoading } = useAuth();
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const passwordValue = watch("password");

  const onSubmit = async (data: RegisterFormData) => {
    setFormError(null);
    try {
      await registerUser(data);
      toast.success("Account created! Let's set up your first project.");
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object" && "email" in err.details) {
          setFormError("A user with this email already exists.");
        } else {
          setFormError(err.message || "Failed to create account. Please try again.");
        }
      } else {
        setFormError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start capturing and triaging bugs with your team in under a minute."
      inviteNotice={
        isInviteFlow ? "Create your account to join the invited project." : null
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
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Alex Rivera"
            autoComplete="name"
            error={!!errors.fullName}
            {...register("fullName")}
          />
          {errors.fullName && <p className="text-[11px] text-danger">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-1.5 text-left">
          <Label htmlFor="email">Work Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="alex@company.dev"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && <p className="text-[11px] text-danger">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5 text-left">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
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

          <PasswordStrengthMeter password={passwordValue} />
        </div>

        <Button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Create Account
        </Button>

        <div className="pt-1 text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link
            to={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}
            className="font-medium text-accent hover:underline"
          >
            Log in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
