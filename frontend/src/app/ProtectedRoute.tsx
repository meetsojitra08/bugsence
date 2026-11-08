import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="h-8 w-32 animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-4 w-48 animate-pulse rounded bg-surface" />
          <div className="space-y-2 pt-4">
            <div className="h-10 w-full animate-pulse rounded-md bg-surface" />
            <div className="h-10 w-full animate-pulse rounded-md bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
}
