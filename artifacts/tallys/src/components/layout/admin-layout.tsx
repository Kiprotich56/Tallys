import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Scissors, Calendar, Users, LayoutDashboard, Star, LogOut, ChevronRight,
  Database, MessageSquare, TrendingUp, Menu, X, Mail
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { href: "/",              label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: "/appointments",  label: "Appointments", icon: Calendar },
  { href: "/customers",     label: "Customers",    icon: Users },
  { href: "/services",      label: "Services",     icon: Scissors },
  { href: "/staff",         label: "Staff",        icon: Star },
  { href: "/commissions",   label: "Commissions",  icon: TrendingUp },
  { href: "/reviews",       label: "Reviews",      icon: MessageSquare },
  { href: "/contact",       label: "Contacts",     icon: Mail },
  { href: "/database",      label: "Database",     icon: Database },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <>
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? location === href : location.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-accent/10 hover:text-primary"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
            {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
          </Link>
        );
      })}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="~/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
            <Scissors className="w-5 h-5" />
            <span>Tally's Admin</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-border space-y-2">
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

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={closeMobile} />
          <aside className="relative w-72 max-w-[85vw] bg-card border-r border-border flex flex-col z-50 overflow-hidden">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border flex-shrink-0">
              <Link href="~/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl" onClick={closeMobile}>
                <Scissors className="w-5 h-5" />
                <span>Tally's Admin</span>
              </Link>
              <button onClick={closeMobile} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              <NavLinks onNavigate={closeMobile} />
            </nav>

            <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Signed in as <span className="text-foreground font-medium truncate block">{user?.email}</span>
              </div>
              <Link href="~/" onClick={closeMobile} className="flex items-center justify-center w-full py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
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
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger on mobile */}
            <button
              className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base md:text-lg font-medium">Management Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
