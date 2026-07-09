import { useState } from "react";
import { useListServices } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search, Scissors } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const { data: services, isLoading } = useListServices();
  const [selected, setSelected] = useState<any | null>(null);

  const filteredServices = services?.filter((s: any) => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories: string[] = Array.from(new Set(services?.map((s: any) => s.category as string) || []));

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Our Services</h1>
        <p className="text-muted-foreground text-lg">
          Expert grooming and beauty treatments tailored to your unique style.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-16 relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input 
          className="pl-10 h-12 bg-card border-border"
          placeholder="Search for a service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading services...</div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-16">
          {categories.map(category => {
            const categoryServices = filteredServices?.filter(s => s.category === category);
            
            if (!categoryServices?.length) return null;

            return (
              <div key={category}>
                <h2 className="text-2xl font-serif font-bold mb-6 text-primary border-b border-border/50 pb-2">
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categoryServices.map(service => (
                    <button
                      key={service.id}
                      onClick={() => setSelected(service)}
                      className="text-left bg-card border border-border p-6 rounded-lg flex flex-col justify-between hover:border-primary/50 transition-colors"
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                          {service.imageUrl ? (
                            <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                          ) : (
                            <Scissors className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold">{service.name}</h3>
                            <span className="text-primary font-medium whitespace-nowrap ml-4">
                              KSh {service.priceKes.toLocaleString()}
                            </span>
                          </div>
                          {service.description && (
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-4">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                          {service.durationMinutes} mins
                        </span>
                        <span className="text-primary hover:text-primary/80 font-medium">
                          View details →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          
          {filteredServices?.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              No services found matching "{search}".
            </div>
          )}
        </div>
      )}

      {/* Service details modal — shows the full image (not cropped to the
          circular thumbnail) alongside the full description. */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              {selected.imageUrl && (
                <div className="w-full h-56 -mt-2 rounded-lg overflow-hidden bg-muted">
                  <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span>{selected.name}</span>
                  <span className="text-primary text-base whitespace-nowrap">
                    KSh {selected.priceKes.toLocaleString()}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-left pt-2 text-foreground/90">
                  {selected.description || "No description provided yet for this service."}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-between items-center text-sm border-t border-border pt-4 mt-2">
                <span className="text-muted-foreground">{selected.category} · {selected.durationMinutes} mins</span>
                <a href="/book" className="text-primary font-medium hover:underline">Book Now →</a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
