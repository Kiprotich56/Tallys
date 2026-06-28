import { useState } from "react";
import { 
  useListAppointments, 
  useUpdateAppointment, 
  useConfirmAppointment,
  useCancelAppointment,
  useCompleteAppointment,
  getListAppointmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Calendar as CalendarIcon, Clock, MoreVertical, Check, X, Edit2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { format, parseISO } from "date-fns";

export default function AdminAppointments() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  const queryClient = useQueryClient();
  const { data: appointments, isLoading } = useListAppointments();
  
  const confirmAppointment = useConfirmAppointment();
  const cancelAppointment = useCancelAppointment();
  const completeAppointment = useCompleteAppointment();

  const handleAction = (id: number, action: 'confirm' | 'cancel' | 'complete') => {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
    };

    if (action === 'confirm') confirmAppointment.mutate({ id }, { onSuccess });
    if (action === 'cancel') cancelAppointment.mutate({ id }, { onSuccess });
    if (action === 'complete') completeAppointment.mutate({ id }, { onSuccess });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-900/30 text-amber-500';
      case 'confirmed': return 'bg-blue-900/30 text-blue-400';
      case 'completed': return 'bg-green-900/30 text-green-500';
      case 'cancelled': return 'bg-red-900/30 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredAppointments = appointments?.filter(app => {
    const matchesFilter = filter === "all" || app.status.toLowerCase() === filter;
    const matchesSearch = 
      (app.customerName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (app.serviceName?.toLowerCase() || "").includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Appointments</h1>
          <p className="text-muted-foreground text-sm">Manage all customer bookings.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9"
            placeholder="Search by customer or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 self-start sm:self-auto overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          {["all", "pending", "confirmed", "completed", "cancelled"].map(f => (
            <Button 
              key={f} 
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize whitespace-nowrap"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left border-b border-border">
              <tr>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Service</th>
                <th className="p-4 font-medium">Staff</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading appointments...</td></tr>
              ) : filteredAppointments?.map(app => (
                <tr key={app.id} className="hover:bg-accent/5">
                  <td className="p-4">
                    <div className="font-bold">{app.customerName}</div>
                    {app.notes && (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]">Note: {app.notes}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      {format(parseISO(app.date), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm mt-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {app.timeSlot}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-sm">{app.serviceName}</div>
                    <div className="text-xs text-primary font-bold mt-1">KSh {app.totalKes.toLocaleString()}</div>
                  </td>
                  <td className="p-4 text-sm">{app.staffName}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {app.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handleAction(app.id, 'confirm')} className="text-blue-500">
                            <Check className="mr-2 h-4 w-4" /> Confirm
                          </DropdownMenuItem>
                        )}
                        
                        {app.status === 'confirmed' && (
                          <DropdownMenuItem onClick={() => handleAction(app.id, 'complete')} className="text-green-500">
                            <Play className="mr-2 h-4 w-4" /> Mark Completed
                          </DropdownMenuItem>
                        )}
                        
                        {(app.status === 'pending' || app.status === 'confirmed') && (
                          <DropdownMenuItem onClick={() => handleAction(app.id, 'cancel')} className="text-red-500">
                            <X className="mr-2 h-4 w-4" /> Cancel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredAppointments?.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No appointments found matching filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}