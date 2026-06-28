import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Scissors, User, LogOut, LayoutDashboard, ChevronDown, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    await logout();
    setLocation("/");
  };

  return (
    <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl flex-shrink-0">
          <Scissors className="w-6 h-6" />
          <span>Tally's</span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
          <Link href="/team" className="hover:text-primary transition-colors">Team</Link>
          <Link href="/reviews" className="hover:text-primary transition-colors">Reviews</Link>
          {user && (
            <Link href="/portal" className="hover:text-primary transition-colors">My Portal</Link>
          )}
        </div>

        {/* Desktop Right Side */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/book"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Book Now
          </Link>

          {isLoading ? (
            <div className="w-9 h-9 rounded-full bg-card border border-border animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-border hover:border-primary/50 bg-card transition-colors text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="max-w-[100px] truncate font-medium">{user.name}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/portal"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent/10 hover:text-primary transition-colors"
                      >
                        <User className="w-4 h-4" />
                        My Portal
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent/10 hover:text-primary transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      )}
                    </div>
                    <div className="py-1 border-t border-border">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/10 hover:text-primary transition-colors"
            >
              <User className="w-4 h-4" />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {[
              { href: "/services", label: "Services" },
              { href: "/team", label: "Team" },
              { href: "/reviews", label: "Reviews" },
              ...(user ? [{ href: "/portal", label: "My Portal" }] : []),
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent/10 hover:text-primary transition-colors"
              >
                {label}
              </Link>
            ))}

            <div className="pt-3 space-y-2 border-t border-border">
              <Link
                href="/book"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Book Appointment
              </Link>

              {user ? (
                <>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-medium hover:bg-accent/10 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <div className="px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">Signed in as <span className="text-foreground font-medium">{user.name}</span></p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-medium hover:bg-accent/10 hover:text-primary transition-colors"
                >
                  <User className="w-4 h-4" />
                  Sign In / Create Account
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
