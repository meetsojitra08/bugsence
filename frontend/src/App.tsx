import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/app/theme-provider";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LandingPage } from "@/features/landing/LandingPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { TodayPage } from "@/features/dashboard/TodayPage";
import { InsightsPage } from "@/features/dashboard/InsightsPage";
import { InboxPage } from "@/features/issues/pages/InboxPage";
import { ProjectMembersPage } from "@/features/projects/pages/ProjectMembersPage";
import { InviteAcceptPage } from "@/features/projects/pages/InviteAcceptPage";
import { PublicReportPage } from "@/features/issues/pages/PublicReportPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { IssuesPage } from "@/features/issues/pages/IssuesPage";
import { IssueDetailPage } from "@/features/issues/pages/IssueDetailPage";
import { BoardPage } from "@/features/issues/pages/BoardPage";
import { Toaster } from "sonner";

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Marketing, Auth, Invite & External Bug Report Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/invite/:token" element={<InviteAcceptPage />} />
                <Route path="/report/:projectKey" element={<PublicReportPage />} />

                {/* Protected App Shell Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="today" element={<TodayPage />} />
                  <Route path="p/:key/today" element={<TodayPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="p/:key/dashboard" element={<DashboardPage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="p/:key/inbox" element={<InboxPage />} />
                  <Route path="insights" element={<InsightsPage />} />
                  <Route path="p/:key/insights" element={<InsightsPage />} />
                  <Route path="issues" element={<IssuesPage />} />
                  <Route path="my-issues" element={<IssuesPage />} />
                  <Route path="board" element={<BoardPage />} />
                  <Route path="p/:key/issues" element={<IssuesPage />} />
                  <Route path="p/:key/board" element={<BoardPage />} />
                  <Route path="p/:key/issues/:number" element={<IssueDetailPage />} />
                  <Route path="projects" element={<Navigate to="/settings/members" replace />} />
                  <Route path="settings/members" element={<ProjectMembersPage />} />
                  <Route path="projects/members" element={<ProjectMembersPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Catch-all 404 Fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <Toaster richColors position="bottom-right" />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
