import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListAppointments,
  useCreateAppointment,
  useConfirmAppointment,
  useCancelAppointment,
  useCompleteAppointment,
  useListCustomers,
  useListServices,
  useListStaff,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Calendar as CalendarIcon, Clock, MoreVertical, Check, X, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const createSchema = z.object({
  customerId: z.coerce.number().min(1, "Select a customer"),
  serviceId: z.coerce.number().min(1, "Select a service"),
  staffId: z.coerce.number().min(1, "Select a staff member"),
  date: z.string().min(1, "Select a date"),
  timeSlot: z.string().min(1, "Enter a time slot"),
  notes: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

const TIME_SLOTS = [
  "8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM",
  "1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM",
];

export default function AdminAppointments() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: appointments, isLoading } = useListAppointments();
  const { data: customers } = useListCustomers();
  const { data: services } = useListServices();
  const { data: staff } = useListStaff();

  const confirmAppointment = useConfirmAppointment();
  const cancelAppointment = useCancelAppointment();
  const completeAppointment = useCompleteAppointment();
  const createAppointment = useCreateAppointment();

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { customerId: 0, serviceId: 0, staffId: 0, date: "", timeSlot: "", notes: "" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });

  const handleAction = (id: number, action: 'confirm' | 'cancel' | 'complete') => {
    const onSuccess = () => invalidate();
    if (action === 'confirm') confirmAppointment.mutate({ id }, { onSuccess });
    if (action === 'cancel') cancelAppointment.mutate({ id }, { onSuccess });
    if (action === 'complete') completeAppointment.mutate({ id }, { onSuccess });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Permanently delete this appointment? This removes it from the list and the customer's history and cannot be undone.")) return;
    const res = await fetch(`/api/appointments/${id}/permanent`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      invalidate();
      toast({ title: "Appointment deleted" });
    } else {
      toast({ title: "Failed to delete appointment", variant: "destructive" });
    }
  };

  const handleMarkPayment = async (id: number, paymentStatus: 'paid' | 'pending') => {
    await fetch(`/api/appointments/${id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ paymentStatus }),
    });
    invalidate();
  };

  const onCreateSubmit = (values: CreateForm) => {
    createAppointment.mutate({ data: values }, {
      onSuccess: () => {
        invalidate();
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Appointment created" });
      },
      onError: () => toast({ title: "Failed to create appointment", variant: "destructive" }),
    });
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
      (app.serviceName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (app.staffName?.toLowerCase() || "").includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Appointments</h1>
          <p className="text-muted-foreground text-sm">Manage all customer bookings.</p>
        </div>
        <Button onClick={() => { form.reset({ customerId: 0, serviceId: 0, staffId: 0, date: today, timeSlot: "", notes: "" }); setIsCreateOpen(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Walk-In Booking
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by customer, service or staff..."
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
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading appointments...</td></tr>
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
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      (app as any).paymentStatus === 'paid'
                        ? 'bg-green-900/30 text-green-500'
                        : 'bg-amber-900/30 text-amber-500'
                    }`}>
                      {(app as any).paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
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
                        {(app as any).paymentStatus !== 'paid' && app.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => handleMarkPayment(app.id, 'paid')} className="text-primary">
                            <Check className="mr-2 h-4 w-4" /> Mark Payment Received
                          </DropdownMenuItem>
                        )}
                        {(app as any).paymentStatus === 'paid' && (
                          <DropdownMenuItem onClick={() => handleMarkPayment(app.id, 'pending')} className="text-muted-foreground">
                            <X className="mr-2 h-4 w-4" /> Revert Payment
                          </DropdownMenuItem>
                        )}
                        {(app.status === 'pending' || app.status === 'confirmed') && (
                          <DropdownMenuItem onClick={() => handleAction(app.id, 'cancel')} className="text-red-500">
                            <X className="mr-2 h-4 w-4" /> Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(app.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredAppointments?.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No appointments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Walk-In Booking</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                      <option value={0}>Select customer…</option>
                      {customers?.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="serviceId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                        <option value={0}>Select service…</option>
                        {services?.filter(s => s.isActive).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="staffId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                        <option value={0}>Select staff…</option>
                        {staff?.filter(s => s.isActive).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" min={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="timeSlot" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Slot</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                        <option value="">Select time…</option>
                        {TIME_SLOTS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any special requests or notes…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? "Creating…" : "Create Appointment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
