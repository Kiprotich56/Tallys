import { motion } from "framer-motion";
import { Link } from "wouter";
import { Star, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListServices } from "@workspace/api-client-react";

export default function Home() {
  const { data: services } = useListServices({ category: "Haircuts" });

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero.png" 
            alt="Tally's Barbershop Interior" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 tracking-tight"
          >
            Nairobi's Premium<br />
            <span className="text-primary italic">Atelier</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
          >
            Dreadlocks specialists, dye masters, and precision cuts. 
            Experience grooming with unapologetic luxury.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/book" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-auto">
              Book Appointment
            </Link>
            <Link href="/services" className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-transparent px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-auto">
              View Services
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Signature Services</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services?.slice(0, 3).map((service, i) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background border border-border p-6 rounded-lg hover:border-primary/50 transition-colors"
              >
                <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                <p className="text-muted-foreground mb-4 h-12 line-clamp-2">
                  {service.description || "Premium service performed by our master barbers."}
                </p>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-primary">KSh {service.priceKes.toLocaleString()}</span>
                  <span className="text-muted-foreground">{service.durationMinutes} mins</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/services" className="inline-flex items-center text-primary hover:text-primary/80 font-medium">
              View Full Menu <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Loyalty Teaser */}
      <section className="py-24 border-y border-border/50 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Star className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">The Tally's Society</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join our exclusive loyalty program. Earn points with every visit, unlock premium benefits, 
              and experience the pinnacle of grooming luxury. From free scrubs to priority bookings.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-left">
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier) => (
                <div key={tier} className="p-4 bg-card rounded-md border border-border">
                  <div className="font-bold text-primary mb-1">{tier}</div>
                  <div className="text-xs text-muted-foreground">Exclusive perks</div>
                </div>
              ))}
            </div>
            <Link href="/portal" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              Join the Society
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}