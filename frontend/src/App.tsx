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
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProjectMembersPage } from "@/features/projects/pages/ProjectMembersPage";
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
                {/* Public Marketing Landing & Auth Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected App Shell Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="p/:key/dashboard" element={<DashboardPage />} />
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
