import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext"; // Corrected import path
import Index from "@/pages/Index"; // Corrected import path
import NotFound from "@/pages/NotFound"; // Corrected import path
import AuthPage from "@/pages/Auth"; // Corrected import path
import CoachDashboard from "@/pages/coach/Dashboard"; // Corrected import path
import StudentDashboard from "@/pages/student/Dashboard"; // Corrected import path
import AdminDashboard from "@/pages/admin/Dashboard"; // AdminDashboard import edildi // Corrected import path
import ProtectedRoute from "@/components/ProtectedRoute"; // Corrected import path

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/coach/dashboard",
    element: (
      <ProtectedRoute allowedRoles={['coach']}>
        <CoachDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/student/dashboard",
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <StudentDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/dashboard", // Admin rotası eklendi
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;