import { useState } from "react";
import { Link } from "wouter";
import { Scissors, Calendar, Users, LayoutDashboard, Settings } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
            <Scissors className="w-5 h-5" />
            <span>Tally's Admin</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent/10 hover:text-primary transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/admin/appointments" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent/10 hover:text-primary transition-colors">
            <Calendar className="w-4 h-4" />
            Appointments
          </Link>
          <Link href="/admin/customers" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent/10 hover:text-primary transition-colors">
            <Users className="w-4 h-4" />
            Customers
          </Link>
          <Link href="/admin/services" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent/10 hover:text-primary transition-colors">
            <Scissors className="w-4 h-4" />
            Services
          </Link>
          <Link href="/admin/staff" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground hover:bg-accent/10 hover:text-primary transition-colors">
            <Star className="w-4 h-4" />
            Staff
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border">
          <Link href="/" className="flex items-center justify-center w-full py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            Back to Website
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-medium">Management Portal</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              A
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

// Temporary Star icon since it wasn't imported
function Star(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}