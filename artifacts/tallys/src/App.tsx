import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Public Pages
import Home from "@/pages/home";
import ServicesPage from "@/pages/services";
import BookPage from "@/pages/book";
import TeamPage from "@/pages/team";
import ReviewsPage from "@/pages/reviews";

// Portal
import PortalDashboard from "@/pages/portal";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminAppointments from "@/pages/admin/appointments";
import AdminCustomers from "@/pages/admin/customers";
import AdminServices from "@/pages/admin/services";
import AdminStaff from "@/pages/admin/staff";

// Layouts
import PublicLayout from "@/components/layout/public-layout";
import AdminLayout from "@/components/layout/admin-layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/admin" nested>
        <AdminLayout>
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/appointments" component={AdminAppointments} />
            <Route path="/customers" component={AdminCustomers} />
            <Route path="/services" component={AdminServices} />
            <Route path="/staff" component={AdminStaff} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>

      {/* Public & Portal Routes */}
      <Route path="/">
        <PublicLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/book" component={BookPage} />
            <Route path="/team" component={TeamPage} />
            <Route path="/reviews" component={ReviewsPage} />
            <Route path="/portal" component={PortalDashboard} />
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
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;