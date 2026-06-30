import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "@/pages/home";
import ServicesPage from "@/pages/services";
import BookPage from "@/pages/book";
import TeamPage from "@/pages/team";
import ReviewsPage from "@/pages/reviews";
import LoginPage from "@/pages/login";

// Portal
import PortalDashboard from "@/pages/portal";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminAppointments from "@/pages/admin/appointments";
import AdminCustomers from "@/pages/admin/customers";
import AdminServices from "@/pages/admin/services";
import AdminStaff from "@/pages/admin/staff";
import AdminDatabase from "@/pages/admin/database";
import AdminReviews from "@/pages/admin/reviews";
import AdminCommissions from "@/pages/admin/commissions";
import AdminContactSubmissions from "@/pages/admin/contact-submissions";

// Layouts
import PublicLayout from "@/components/layout/public-layout";
import AdminLayout from "@/components/layout/admin-layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "admin") return <Redirect to="/portal" />;
  return <>{children}</>;
}

function PortalGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function BookGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Redirect to="/login?redirect=/book" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Admin Routes — protected, nest strips /admin prefix */}
      <Route path="/admin" nest>
        <AdminGuard>
          <AdminLayout>
            <Switch>
              <Route path="/" component={AdminDashboard} />
              <Route path="/appointments" component={AdminAppointments} />
              <Route path="/customers" component={AdminCustomers} />
              <Route path="/services" component={AdminServices} />
              <Route path="/staff" component={AdminStaff} />
              <Route path="/commissions" component={AdminCommissions} />
              <Route path="/reviews" component={AdminReviews} />
              <Route path="/contact" component={AdminContactSubmissions} />
              <Route path="/database" component={AdminDatabase} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </AdminGuard>
      </Route>

      {/* Standalone pages (no public layout) */}
      <Route path="/login" component={LoginPage} />

      {/* Public & Portal Routes */}
      <Route>
        <PublicLayout>
          <Switch>
            <Route path="/services" component={ServicesPage} />
            <Route path="/book">
              <BookGuard>
                <BookPage />
              </BookGuard>
            </Route>
            <Route path="/team" component={TeamPage} />
            <Route path="/reviews" component={ReviewsPage} />
            <Route path="/portal">
              <PortalGuard>
                <PortalDashboard />
              </PortalGuard>
            </Route>
            <Route path="/" component={Home} />
            <Route component={NotFound} />
          </Switch>
        </PublicLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
