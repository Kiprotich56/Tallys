import { Link, useLocation } from "wouter";
import { Scissors, Calendar, Users, LayoutDashboard, Star, LogOut, ChevronRight, Database, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { href: "/",            label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: "/appointments",label: "Appointments", icon: Calendar },
  { href: "/customers",   label: "Customers",    icon: Users },
  { href: "/services",    label: "Services",     icon: Scissors },
  { href: "/staff",       label: "Staff",        icon: Star },
  { href: "/reviews",     label: "Reviews",      icon: MessageSquare },
  { href: "/database",    label: "Database",     icon: Database },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          {/* ~/ means root-absolute, bypasses the /admin nest base */}
          <Link href="~/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
            <Scissors className="w-5 h-5" />
            <span>Tally's Admin</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? location === href : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent/10 hover:text-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          {/* ~/ navigates to the true root, not /admin/ */}
          <Link href="~/" className="flex items-center justify-center w-full py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Website
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-medium">Management Portal</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
