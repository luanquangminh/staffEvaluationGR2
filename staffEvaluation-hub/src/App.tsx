import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages (code splitting)
const Assessment = lazy(() => import("./pages/Assessment"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));
const AdminGroups = lazy(() => import("./pages/admin/AdminGroups"));
const AdminQuestions = lazy(() => import("./pages/admin/AdminQuestions"));
const AdminResults = lazy(() => import("./pages/admin/AdminResults"));
const AdminCharts = lazy(() => import("./pages/admin/AdminCharts"));
const AdminPeriods = lazy(() => import("./pages/admin/AdminPeriods"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/assessment" element={<Assessment />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Accessible to both admin and moderator */}
                <Route element={<ProtectedRoute requireAdmin><MainLayout /></ProtectedRoute>}>
                  <Route path="/admin/groups" element={<AdminGroups />} />
                </Route>

                {/* Results: accessible to all authenticated users (backend enforces role-permission filter) */}
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/admin/results" element={<AdminResults />} />
                </Route>

                {/* Admin-only routes */}
                <Route element={<ProtectedRoute requireAdminOnly><MainLayout /></ProtectedRoute>}>
                  <Route path="/admin/staff" element={<AdminStaff />} />
                  <Route path="/admin/questions" element={<AdminQuestions />} />
                  <Route path="/admin/charts" element={<AdminCharts />} />
                  <Route path="/admin/periods" element={<AdminPeriods />} />
                  <Route path="/admin/roles" element={<AdminRoles />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
