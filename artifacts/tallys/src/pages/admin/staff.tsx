import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListStaff, useCreateStaff, useUpdateStaff, useDeleteStaff,
  getListStaffQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  bio: z.string().optional(),
  commissionPct: z.coerce.number().min(0).max(100),
  isActive: z.boolean().default(true),
  specializationsRaw: z.string().default(""),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export default function AdminStaff() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: staff, isLoading } = useListStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", role: "Barber", bio: "", commissionPct: 50, isActive: true, specializationsRaw: "" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });

  const buildPayload = (values: StaffFormValues) => ({
    name: values.name,
    role: values.role,
    bio: values.bio,
    commissionPct: values.commissionPct,
    isActive: values.isActive,
    specializations: values.specializationsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const onSubmit = (values: StaffFormValues) => {
    const data = buildPayload(values);
    if (editingId) {
      updateStaff.mutate({ id: editingId, data }, {
        onSuccess: () => { invalidate(); setIsDialogOpen(false); form.reset(); toast({ title: "Staff updated" }); },
        onError: () => toast({ title: "Failed to update staff", variant: "destructive" }),
      });
    } else {
      createStaff.mutate({ data }, {
        onSuccess: () => { invalidate(); setIsDialogOpen(false); form.reset(); toast({ title: "Staff member created" }); },
        onError: () => toast({ title: "Failed to create staff member", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (member: any) => {
    setEditingId(member.id);
    form.reset({
      name: member.name,
      role: member.role,
      bio: member.bio || "",
      commissionPct: member.commissionPct ?? 50,
      isActive: member.isActive,
      specializationsRaw: member.specializations?.join(", ") ?? "",
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingId(null);
    form.reset({ name: "", role: "Barber", bio: "", commissionPct: 50, isActive: true, specializationsRaw: "" });
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteStaff.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "Staff member removed" }); },
      onError: () => toast({ title: "Failed to remove staff member", variant: "destructive" }),
    });
  };

  const filteredStaff = staff?.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">Staff Management</h1>
          <p className="text-muted-foreground text-sm">Manage professionals, commissions, and performance.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl><Input placeholder="e.g. Master Barber" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="specializationsRaw" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specializations (comma-separated)</FormLabel>
                    <FormControl><Input placeholder="Fades, Dreadlocks, Dyeing" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="commissionPct" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission (%)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Short biography..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Staff appears in booking flow</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createStaff.isPending || updateStaff.isPending}>
                    {editingId ? "Save Changes" : "Create Profile"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteStaff.isPending}>
              {deleteStaff.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center max-w-md relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background text-muted-foreground text-xs uppercase tracking-wider text-left border-b border-border">
              <tr>
                <th className="p-4 font-medium">Professional</th>
                <th className="p-4 font-medium">Metrics</th>
                <th className="p-4 font-medium">Specializations</th>
                <th className="p-4 font-medium">Comm. %</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading staff...</td></tr>
              ) : filteredStaff?.map(member => (
                <tr key={member.id} className="hover:bg-accent/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex-shrink-0 overflow-hidden">
                        <img src={member.photoUrl || `/team-1.png`} alt={member.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold">{member.name}</div>
                        <div className="text-sm text-primary">{member.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm font-medium mb-1">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      {member.rating ? member.rating.toFixed(1) : "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground">{member.completedServices || 0} services</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {member.specializations?.slice(0, 2).map(spec => (
                        <span key={spec} className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] uppercase">
                          {spec}
                        </span>
                      ))}
                      {member.specializations && member.specializations.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                          +{member.specializations.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{member.commissionPct}%</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      member.isActive ? "bg-green-900/30 text-green-500" : "bg-muted text-muted-foreground"
                    }`}>
                      {member.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(member)} className="h-8 px-2 text-muted-foreground hover:text-primary">
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: member.id, name: member.name })} className="h-8 px-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStaff?.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No staff found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
