import { useState } from "react";
import { Link } from "wouter";
import { Star, Calendar, Clock, Crown, History } from "lucide-react";
import { 
  useGetCustomer, 
  useGetCustomerAppointments,
  useGetLoyalty,
  useCancelAppointment
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function PortalDashboard() {
  // In a real app we'd get the authenticated user ID from context.
  // Using ID 1 for demonstration.
  const customerId = 1;
  
  const { data: customer } = useGetCustomer(customerId);
  const { data: appointments } = useGetCustomerAppointments(customerId);
  const { data: loyalty } = useGetLoyalty(customerId);
  
  const cancelAppointment = useCancelAppointment();
  
  const handleCancel = (id: number) => {
    if(confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointment.mutate({ id });
    }
  };

  const getTierColor = (tier: string) => {
    switch(tier.toLowerCase()) {
      case 'platinum': return 'text-slate-200 border-slate-200';
      case 'gold': return 'text-primary border-primary';
      case 'silver': return 'text-slate-400 border-slate-400';
      default: return 'text-amber-700 border-amber-700';
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-12">
        <h1 className="text-3xl font-serif font-bold mb-2">Welcome back, {customer?.name || "Client"}</h1>
        <p className="text-muted-foreground">Manage your appointments and view your Tally's Society benefits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-card border border-border p-6 rounded-lg md:col-span-2">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Calendar className="w-5 h-5" />
            <h2 className="text-xl font-bold">Upcoming Appointments</h2>
          </div>
          
          <div className="space-y-4">
            {appointments?.filter(a => a.status === 'confirmed' || a.status === 'pending').map(app => (
              <div key={app.id} className="border border-border p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">{app.serviceName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {new Date(app.date).toLocaleDateString()} at {app.timeSlot}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">with {app.staffName}</p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded uppercase tracking-wider font-bold">
                    {app.status}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleCancel(app.id)} disabled={cancelAppointment.isPending}>
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
            
            {(!appointments || appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length === 0) && (
              <div className="text-center py-8 text-muted-foreground bg-background/50 rounded-md border border-dashed border-border">
                No upcoming appointments.
                <div className="mt-4">
                  <Link href="/book" className="text-primary hover:underline">Book an appointment</Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-card border border-border p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <Crown className="w-5 h-5" />
              <h2 className="text-xl font-bold">Society Status</h2>
            </div>
            
            <div className="text-center mb-6">
              <div className={`inline-block px-4 py-1 border rounded-full font-bold mb-4 uppercase tracking-wider ${getTierColor(loyalty?.tier || 'Bronze')}`}>
                {loyalty?.tier || 'Bronze'} Tier
              </div>
              <p className="text-3xl font-serif font-bold">{loyalty?.points || 0}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Points</p>
            </div>
            
            {loyalty?.nextTier && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to {loyalty.nextTier}</span>
                  <span>{loyalty.visitsToNextTier} visits left</span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '40%' }}></div>
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Benefits</h4>
              <ul className="text-sm space-y-2">
                {loyalty?.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                )) || (
                  <li className="text-muted-foreground text-center py-2">Join to see benefits</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card border border-border p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-6 text-primary">
          <History className="w-5 h-5" />
          <h2 className="text-xl font-bold">Past Appointments</h2>
        </div>
        
        <div className="space-y-4">
          {appointments?.filter(a => a.status === 'completed').slice(0, 5).map(app => (
            <div key={app.id} className="border border-border/50 p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold">{app.serviceName}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(app.date).toLocaleDateString()} with {app.staffName}
                </p>
              </div>
              <div className="font-medium text-primary">
                KSh {app.totalKes?.toLocaleString()}
              </div>
            </div>
          ))}
          
          {(!appointments || appointments.filter(a => a.status === 'completed').length === 0) && (
            <div className="text-center py-4 text-muted-foreground">
              No past appointments found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}