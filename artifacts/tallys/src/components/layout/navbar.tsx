import { Link } from "wouter";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary font-serif font-bold text-xl">
          <Scissors className="w-6 h-6" />
          <span>Tally's</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
          <Link href="/team" className="hover:text-primary transition-colors">Team</Link>
          <Link href="/reviews" className="hover:text-primary transition-colors">Reviews</Link>
          <Link href="/portal" className="hover:text-primary transition-colors">Portal</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/book" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            Book Appointment
          </Link>
        </div>
      </div>
    </nav>
  );
}