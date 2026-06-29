import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListCustomers,
  useUpdateCustomer,
  useGetCustomerAppointments,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Crown, X, Calendar, Edit2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

function CustomerHistoryPanel({ customerId, onClose }: { customerId: number; onClose: () => void }) {
  const { data: appointments, isLoading } = useGetCustomerAppointments(customerId);

  return (
    <div className="mt-6 border-t border-border pt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Appointment History</h4>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading history…</div>
      ) : appointments && appointments.length > 0 ? (
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {appointments.map((appt: any) => (
            <div key={appt.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div>
                <div className="text-sm font-medium">{appt.serviceName}</div>
                <div className="text-xs text-muted-foreground">{appt.staffName} · {format(parseISO(appt.date), "MMM d, yyyy")} {appt.timeSlot}</div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                  appt.status === 'completed' ? 'bg-green-900/30 text-green-500' :
                  appt.status === 'confirmed' ? 'bg-blue-900/30 text-blue-400' :
                  appt.status === 'cancelled' ? 'bg-red-900/30 text-red-500' :
                  'bg-amber-900/30 text-amber-500'
                }`}>{appt.status}</span>
                <div className="text-xs text-primary font-medium mt-1">KSh {appt.totalKes?.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-4 text-center">No appointments yet.</div>
      )}
    </div>
  );
}

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: customers, isLoading } = useListCustomers({ search });
  const updateCustomer = useUpdateCustomer();

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", phone: "", email: "", gender: "" },
  });

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'bg-slate-200 text-slate-800';
      case 'gold': return 'bg-primary text-primary-foreground';
      case 'silver': return 'bg-slate-400 text-slate-900';
      default: return 'bg-amber-700 text-white';
    }
  };

  const openCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setShowHistory(false);
    setIsEditing(false);
    form.reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      gender: customer.gender || "",
    });
  };

  const onEditSubmit = (values: EditForm) => {
    if (!selectedCustomer) return;
    updateCustomer.mutate({ id: selectedCustomer.id, data: { ...values, email: values.email || null, gender: values.gender || null } }, {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        setSelectedCustomer(updated);
        setIsEditing(false);
        toast({ title: "Customer updated" });
      },
      onError: () => toast({ title: "Failed to update customer", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif mb-1">Customers</h1>
        <p className="text-muted-foreground text-sm">View client profiles, loyalty status, and appointment history.</p>
      </div>

      <div className="flex items-center w-full max-w-md relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left border-b border-border">
              <tr>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Loyalty Tier</th>
                <th className="p-4 font-medium">Total Visits</th>
                <th className="p-4 font-medium">Total Spent</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading customers...</td></tr>
              ) : customers?.map(customer => (
                <tr key={customer.id} className="hover:bg-accent/5 cursor-pointer" onClick={() => openCustomer(customer)}>
                  <td className="p-4">
                    <div className="font-bold flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                        {customer.name.charAt(0)}
                      </div>
                      {customer.name}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{customer.phone}</div>
                    {customer.email && <div className="text-xs text-muted-foreground mt-0.5">{customer.email}</div>}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${getTierColor(customer.loyaltyTier)}`}>
                      <Crown className="w-3 h-3" />
                      {customer.loyaltyTier}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1.5 ml-1">
                      {customer.loyaltyPoints} pts
                    </div>
                  </td>
                  <td className="p-4 font-medium">{customer.totalVisits}</td>
                  <td className="p-4 font-bold text-primary">KSh {customer.totalSpentKes.toLocaleString()}</td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openCustomer(customer)} className="h-8 px-2 text-muted-foreground hover:text-primary">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && customers?.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold uppercase">
                {selectedCustomer?.name?.charAt(0)}
              </div>
              {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-primary">{selectedCustomer?.totalVisits}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Visits</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-primary">{selectedCustomer?.loyaltyPoints}</div>
                <div className="text-xs text-muted-foreground mt-1">Loyalty Points</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-sm font-bold text-primary">{selectedCustomer ? `KSh ${selectedCustomer.totalSpentKes?.toLocaleString()}` : "—"}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Spent</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${getTierColor(selectedCustomer?.loyaltyTier)}`}>
                <Crown className="w-3 h-3" />
                {selectedCustomer?.loyaltyTier} Member
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowHistory(!showHistory); setIsEditing(false); }} className="h-8">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" /> History
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(!isEditing); setShowHistory(false); }} className="h-8">
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              </div>
            </div>

            {isEditing && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 border border-border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="optional" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                          <option value="">Prefer not to say</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )} />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={updateCustomer.isPending} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {updateCustomer.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {showHistory && selectedCustomer && (
              <CustomerHistoryPanel customerId={selectedCustomer.id} onClose={() => setShowHistory(false)} />
            )}

            {!isEditing && !showHistory && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{selectedCustomer?.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Email</span>
                  <span>{selectedCustomer?.email || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Gender</span>
                  <span className="capitalize">{selectedCustomer?.gender || "—"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Member Since</span>
                  <span>{selectedCustomer?.createdAt ? format(parseISO(selectedCustomer.createdAt), "MMM d, yyyy") : "—"}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
