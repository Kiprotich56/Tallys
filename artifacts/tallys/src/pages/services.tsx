import { useState } from "react";
import { useListServices } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const { data: services, isLoading } = useListServices();

  const filteredServices = services?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(services?.map(s => s.category) || []));

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
                    <div key={service.id} className="bg-card border border-border p-6 rounded-lg flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-bold">{service.name}</h3>
                          <span className="text-primary font-medium whitespace-nowrap ml-4">
                            KSh {service.priceKes.toLocaleString()}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-muted-foreground text-sm mb-4">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                          {service.durationMinutes} mins
                        </span>
                        <a href="/book" className="text-primary hover:text-primary/80 font-medium">
                          Book Now
                        </a>
                      </div>
                    </div>
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
    </div>
  );
}