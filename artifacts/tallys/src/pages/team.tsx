import { useState } from "react";
import { Link } from "wouter";
import { useListStaff } from "@workspace/api-client-react";
import { Star } from "lucide-react";

export default function TeamPage() {
  const { data: staff, isLoading } = useListStaff();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Meet Our Experts</h1>
        <p className="text-muted-foreground text-lg">
          Our team of master barbers and beauty specialists are dedicated to perfecting your look.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading team profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {staff?.filter(s => s.isActive).map((member, i) => (
            <div key={member.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted relative">
                {/* Fallback photos if not provided */}
                <img 
                  src={member.photoUrl || `/team-${(i % 3) + 1}.png`} 
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold font-serif">{member.name}</h2>
                  {member.rating && (
                    <div className="flex items-center gap-1 text-primary text-sm font-medium">
                      <Star className="w-4 h-4 fill-primary" />
                      {member.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <p className="text-primary text-sm font-medium mb-4">{member.role}</p>
                <p className="text-muted-foreground text-sm mb-6 flex-1">
                  {member.bio || "Dedicated professional with years of experience in the industry."}
                </p>
                
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {member.specializations?.map(spec => (
                      <span key={spec} className="px-2 py-1 bg-background border border-border rounded text-xs">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <Link href="/book" className="w-full text-center h-10 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90">
                  Book with {member.name.split(' ')[0]}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}